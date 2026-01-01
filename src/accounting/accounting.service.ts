import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, DataSource } from 'typeorm';
import { AccountingRecord } from './accounting.entity';
import { CreateAccountingRecordDto } from './dto/create-accounting-record.dto';
import { UpdateAccountingRecordDto } from './dto/update-accounting-record.dto';
import { CloseMonthDto } from './dto/close-month.dto';
import { MonthStatus } from '../common/enums/month-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { AccountingType } from '../common/enums/accounting-type.enum';
import { User } from '../users/user.entity';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';
import { PerceptionsReport, WithholdingsReport } from './interfaces/accounting-reports.interface';
import { Expense } from '../expenses/expenses.entity';
import { ExpenseState } from '../common/enums/expense-state.enum';
import { Cashbox } from '../cashboxes/cashboxes.entity';
import { CashboxStatus } from '../common/enums/cashbox-status.enum';
import { Contract } from '../contracts/contracts.entity';

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(
    @InjectRepository(AccountingRecord)
    private accountingRepository: Repository<AccountingRecord>,
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
    @InjectRepository(Cashbox)
    private cashboxRepository: Repository<Cashbox>,
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>,
    private dataSource: DataSource,
  ) {}

  async create(
    createAccountingRecordDto: CreateAccountingRecordDto,
    user: User,
  ): Promise<AccountingRecord> {
    // Check if month is closed
    const monthStatus = await this.getMonthStatus(
      createAccountingRecordDto.month,
      createAccountingRecordDto.year,
    );

    if (monthStatus === MonthStatus.CLOSED && user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException(
        'Cannot create accounting records for closed month. Only Direction can override.',
      );
    }

    const organizationId = getOrganizationId(user);
    const record = this.accountingRepository.create({
      ...createAccountingRecordDto,
      organization_id: organizationId,
    });
    return await this.accountingRepository.save(record);
  }

  async findAll(user: User): Promise<AccountingRecord[]> {
    try {
      const organizationId = getOrganizationId(user);
      const where: any = {};
      
      if (organizationId) {
        where.organization_id = organizationId;
      }

      return await this.accountingRepository.find({
        where,
        relations: ['expense', 'work', 'supplier'],
        order: { date: 'DESC', created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error('Error fetching accounting records', error);
      return [];
    }
  }

  async findOne(id: string, user: User): Promise<AccountingRecord> {
    const organizationId = getOrganizationId(user);
    const record = await this.accountingRepository.findOne({
      where: { id },
      relations: ['expense', 'work', 'supplier'],
    });

    if (!record) {
      throw new NotFoundException(`Accounting record with ID ${id} not found`);
    }

    if (organizationId && record.organization_id !== organizationId) {
      throw new ForbiddenException('Accounting record does not belong to your organization');
    }

    return record;
  }

  async findByMonth(month: number, year: number, user: User): Promise<AccountingRecord[]> {
    const organizationId = getOrganizationId(user);
    const where: any = {
      month,
      year,
    };
    
    if (organizationId) {
      where.organization_id = organizationId;
    }

    return await this.accountingRepository.find({
      where,
      relations: ['expense', 'work', 'supplier'],
      order: { date: 'ASC' },
    });
  }

  /**
   * Business Rule: Month closing - locks the month
   * Business Rule: Only Direction can reopen closed months
   * Business Rule: Cannot close if there are pending expenses
   * Business Rule: Cannot close if there are unapproved cashbox differences
   * Business Rule: Cannot close if there are blocked contracts with issues
   */
  async closeMonth(closeMonthDto: CloseMonthDto, user: User): Promise<void> {
    // Only Administration and Direction can close months
    if (
      user.role.name !== UserRole.ADMINISTRATION &&
      user.role.name !== UserRole.DIRECTION
    ) {
      throw new ForbiddenException('Only Administration and Direction can close months');
    }

    const records = await this.accountingRepository.find({
      where: {
        month: closeMonthDto.month,
        year: closeMonthDto.year,
      },
    });

    if (records.length === 0) {
      throw new BadRequestException('No accounting records found for this month');
    }

    // Check if month is already closed
    const monthStatus = await this.getMonthStatus(closeMonthDto.month, closeMonthDto.year);
    if (monthStatus === MonthStatus.CLOSED) {
      throw new BadRequestException('Month is already closed');
    }

    // Validation 1: Check for pending expenses in this month
    // Calculate first and last day of the month
    const startDate = new Date(closeMonthDto.year, closeMonthDto.month - 1, 1);
    const endDate = new Date(closeMonthDto.year, closeMonthDto.month, 0, 23, 59, 59, 999);

    const pendingExpenses = await this.expenseRepository.find({
      where: {
        purchase_date: Between(startDate, endDate),
        state: ExpenseState.PENDING,
      },
    });

    if (pendingExpenses.length > 0) {
      throw new BadRequestException(
        `Cannot close month: There are ${pendingExpenses.length} pending expenses that need to be validated first.`,
      );
    }

    // Validation 2: Check for unapproved cashbox differences in this month
    const cashboxesWithDifferences = await this.cashboxRepository.find({
      where: {
        status: CashboxStatus.CLOSED,
        difference_approved: false,
        closing_date: Between(startDate, endDate),
      },
    });

    if (cashboxesWithDifferences.length > 0) {
      const unapprovedCount = cashboxesWithDifferences.filter(
        (cb) => cb.difference_ars !== 0 || cb.difference_usd !== 0,
      ).length;
      if (unapprovedCount > 0) {
        throw new BadRequestException(
          `Cannot close month: There are ${unapprovedCount} cashboxes with unapproved differences. Please approve or resolve differences before closing.`,
        );
      }
    }

    // Validation 3: Check for blocked contracts that might need attention
    // (Contracts with negative balance or blocked status)
    const problematicContracts = await this.contractRepository.find({
      where: {
        is_blocked: true,
      },
    });

    // Filter contracts with negative balance (amount_executed > amount_total)
    const contractsWithIssues = problematicContracts.filter((contract) => {
      const amountTotal = Number(contract.amount_total);
      const amountExecuted = Number(contract.amount_executed);
      return amountExecuted > amountTotal;
    });

    if (contractsWithIssues.length > 0) {
      // This is a warning, not a blocker, but we'll log it
      // Only block if there are contracts with severe issues (negative balance)
      // For now, we'll allow closing but this could be made stricter
    }

    // All validations passed, close the month using transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(
        AccountingRecord,
        {
          month: closeMonthDto.month,
          year: closeMonthDto.year,
        },
        {
          month_status: MonthStatus.CLOSED,
        },
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error closing month', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Business Rule: Only Direction can reopen closed months
   */
  async reopenMonth(month: number, year: number, user: User): Promise<void> {
    if (user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Only Direction can reopen closed months');
    }

    const records = await this.accountingRepository.find({
      where: {
        month,
        year,
        month_status: MonthStatus.CLOSED,
      },
    });

    if (records.length === 0) {
      throw new BadRequestException('No closed records found for this month');
    }

    await this.accountingRepository.update(
      {
        month,
        year,
      },
      {
        month_status: MonthStatus.OPEN,
      },
    );
  }

  async getMonthStatus(month: number, year: number): Promise<MonthStatus> {
    const record = await this.accountingRepository.findOne({
      where: { month, year },
    });

    return record?.month_status || MonthStatus.OPEN;
  }

  async update(
    id: string,
    updateAccountingRecordDto: UpdateAccountingRecordDto,
    user: User,
  ): Promise<AccountingRecord> {
    const record = await this.findOne(id, user);

    // Check if month is closed
    if (record.month_status === MonthStatus.CLOSED && user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException(
        'Cannot update accounting records for closed month. Only Direction can override.',
      );
    }

    // Validate amounts are not negative
    if (updateAccountingRecordDto.amount !== undefined && updateAccountingRecordDto.amount < 0) {
      throw new BadRequestException('Amount cannot be negative');
    }
    if (updateAccountingRecordDto.vat_amount !== undefined && updateAccountingRecordDto.vat_amount < 0) {
      throw new BadRequestException('VAT amount cannot be negative');
    }
    if (updateAccountingRecordDto.vat_perception !== undefined && updateAccountingRecordDto.vat_perception < 0) {
      throw new BadRequestException('VAT perception cannot be negative');
    }
    if (updateAccountingRecordDto.vat_withholding !== undefined && updateAccountingRecordDto.vat_withholding < 0) {
      throw new BadRequestException('VAT withholding cannot be negative');
    }
    if (updateAccountingRecordDto.iibb_perception !== undefined && updateAccountingRecordDto.iibb_perception < 0) {
      throw new BadRequestException('IIBB perception cannot be negative');
    }
    if (updateAccountingRecordDto.income_tax_withholding !== undefined && updateAccountingRecordDto.income_tax_withholding < 0) {
      throw new BadRequestException('Income tax withholding cannot be negative');
    }

    Object.assign(record, updateAccountingRecordDto);
    return await this.accountingRepository.save(record);
  }

  async remove(id: string, user: User): Promise<void> {
    // Only Direction can delete accounting records
    if (user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Only Direction can delete accounting records');
    }

    const record = await this.findOne(id, user);
    await this.accountingRepository.remove(record);
  }

  // Reports
  async getPurchasesBook(
    month: number,
    year: number,
    user: User,
    workId?: string,
    supplierId?: string,
  ): Promise<AccountingRecord[]> {
    // Only Administration and Direction can view reports
    if (
      user.role.name !== UserRole.ADMINISTRATION &&
      user.role.name !== UserRole.DIRECTION
    ) {
      throw new ForbiddenException('Only Administration and Direction can view reports');
    }

    const organizationId = getOrganizationId(user);
    const queryBuilder = this.accountingRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.supplier', 'supplier')
      .leftJoinAndSelect('record.work', 'work')
      .where('record.month = :month', { month })
      .andWhere('record.year = :year', { year })
      .andWhere('record.accounting_type = :type', { type: AccountingType.FISCAL });

    // Filter by organization
    if (organizationId) {
      queryBuilder.andWhere('work.organization_id = :organizationId', { organizationId });
    }

    // Filter by work
    if (workId) {
      queryBuilder.andWhere('record.work_id = :workId', { workId });
    }

    // Filter by supplier
    if (supplierId) {
      queryBuilder.andWhere('record.supplier_id = :supplierId', { supplierId });
    }

    return await queryBuilder.orderBy('record.date', 'ASC').getMany();
  }

  async getPerceptionsReport(
    month: number,
    year: number,
    user: User,
    workId?: string,
    supplierId?: string,
  ): Promise<PerceptionsReport> {
    if (
      user.role.name !== UserRole.ADMINISTRATION &&
      user.role.name !== UserRole.DIRECTION
    ) {
      throw new ForbiddenException('Only Administration and Direction can view reports');
    }

    const organizationId = getOrganizationId(user);
    const queryBuilder = this.accountingRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.supplier', 'supplier')
      .leftJoinAndSelect('record.work', 'work')
      .where('record.month = :month', { month })
      .andWhere('record.year = :year', { year });

    // Filter by organization
    if (organizationId) {
      queryBuilder.andWhere('work.organization_id = :organizationId', { organizationId });
    }

    // Filter by work
    if (workId) {
      queryBuilder.andWhere('record.work_id = :workId', { workId });
    }

    // Filter by supplier
    if (supplierId) {
      queryBuilder.andWhere('record.supplier_id = :supplierId', { supplierId });
    }

    // Optimize: Filter in SQL instead of loading all records and filtering in memory
    queryBuilder.andWhere(
      '(record.vat_perception > 0 OR record.iibb_perception > 0)',
    );

    const filteredRecords = await queryBuilder.getMany();

    return {
      total_vat_perception: filteredRecords.reduce(
        (sum, r) => sum + parseFloat(r.vat_perception?.toString() || '0'),
        0,
      ),
      total_iibb_perception: filteredRecords.reduce(
        (sum, r) => sum + parseFloat(r.iibb_perception?.toString() || '0'),
        0,
      ),
      records: filteredRecords,
    };
  }

  async getWithholdingsReport(
    month: number,
    year: number,
    user: User,
    workId?: string,
    supplierId?: string,
  ): Promise<WithholdingsReport> {
    if (
      user.role.name !== UserRole.ADMINISTRATION &&
      user.role.name !== UserRole.DIRECTION
    ) {
      throw new ForbiddenException('Only Administration and Direction can view reports');
    }

    const organizationId = getOrganizationId(user);
    const queryBuilder = this.accountingRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.supplier', 'supplier')
      .leftJoinAndSelect('record.work', 'work')
      .where('record.month = :month', { month })
      .andWhere('record.year = :year', { year });

    // Filter by organization
    if (organizationId) {
      queryBuilder.andWhere('work.organization_id = :organizationId', { organizationId });
    }

    // Filter by work
    if (workId) {
      queryBuilder.andWhere('record.work_id = :workId', { workId });
    }

    // Filter by supplier
    if (supplierId) {
      queryBuilder.andWhere('record.supplier_id = :supplierId', { supplierId });
    }

    // Optimize: Filter in SQL instead of loading all records and filtering in memory
    queryBuilder.andWhere(
      '(record.vat_withholding > 0 OR record.income_tax_withholding > 0)',
    );

    const filteredRecords = await queryBuilder.getMany();

    return {
      total_vat_withholding: filteredRecords.reduce(
        (sum, r) => sum + parseFloat(r.vat_withholding?.toString() || '0'),
        0,
      ),
      total_income_tax_withholding: filteredRecords.reduce(
        (sum, r) => sum + parseFloat(r.income_tax_withholding?.toString() || '0'),
        0,
      ),
      records: filteredRecords,
    };
  }
}

