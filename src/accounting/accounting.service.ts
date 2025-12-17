import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AccountingRecord } from './accounting.entity';
import { CreateAccountingRecordDto } from './dto/create-accounting-record.dto';
import { UpdateAccountingRecordDto } from './dto/update-accounting-record.dto';
import { CloseMonthDto } from './dto/close-month.dto';
import { MonthStatus } from '../common/enums/month-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { AccountingType } from '../common/enums/accounting-type.enum';
import { User } from '../users/user.entity';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';

@Injectable()
export class AccountingService {
  constructor(
    @InjectRepository(AccountingRecord)
    private accountingRepository: Repository<AccountingRecord>,
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
      console.error('[AccountingService.findAll] Error:', error);
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
    return await this.accountingRepository.find({
      where: {
        month,
        year,
      },
      relations: ['expense', 'work', 'supplier'],
      order: { date: 'ASC' },
    });
  }

  /**
   * Business Rule: Month closing - locks the month
   * Business Rule: Only Direction can reopen closed months
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

    // Update all records to closed status
    await this.accountingRepository.update(
      {
        month: closeMonthDto.month,
        year: closeMonthDto.year,
      },
      {
        month_status: MonthStatus.CLOSED,
      },
    );
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
  async getPurchasesBook(month: number, year: number, user: User): Promise<AccountingRecord[]> {
    // Only Administration and Direction can view reports
    if (
      user.role.name !== UserRole.ADMINISTRATION &&
      user.role.name !== UserRole.DIRECTION
    ) {
      throw new ForbiddenException('Only Administration and Direction can view reports');
    }

    return await this.accountingRepository.find({
      where: {
        month,
        year,
        accounting_type: AccountingType.FISCAL,
      },
      relations: ['supplier', 'work'],
      order: { date: 'ASC' },
    });
  }

  async getPerceptionsReport(month: number, year: number, user: User): Promise<any> {
    if (
      user.role.name !== UserRole.ADMINISTRATION &&
      user.role.name !== UserRole.DIRECTION
    ) {
      throw new ForbiddenException('Only Administration and Direction can view reports');
    }

    const records = await this.accountingRepository.find({
      where: {
        month,
        year,
      },
    });

    return {
      total_vat_perception: records.reduce(
        (sum, r) => sum + parseFloat(r.vat_perception?.toString() || '0'),
        0,
      ),
      total_iibb_perception: records.reduce(
        (sum, r) => sum + parseFloat(r.iibb_perception?.toString() || '0'),
        0,
      ),
      records: records.filter(
        (r) => r.vat_perception > 0 || r.iibb_perception > 0,
      ),
    };
  }

  async getWithholdingsReport(month: number, year: number, user: User): Promise<any> {
    if (
      user.role.name !== UserRole.ADMINISTRATION &&
      user.role.name !== UserRole.DIRECTION
    ) {
      throw new ForbiddenException('Only Administration and Direction can view reports');
    }

    const records = await this.accountingRepository.find({
      where: {
        month,
        year,
      },
    });

    return {
      total_vat_withholding: records.reduce(
        (sum, r) => sum + parseFloat(r.vat_withholding?.toString() || '0'),
        0,
      ),
      total_income_tax_withholding: records.reduce(
        (sum, r) => sum + parseFloat(r.income_tax_withholding?.toString() || '0'),
        0,
      ),
      records: records.filter(
        (r) => r.vat_withholding > 0 || r.income_tax_withholding > 0,
      ),
    };
  }
}

