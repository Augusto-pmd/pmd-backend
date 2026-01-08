import { Injectable, NotFoundException, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Income } from './incomes.entity';
import { Work } from '../works/works.entity';
import { AccountingRecord } from '../accounting/accounting.entity';
import { AccountingType } from '../common/enums/accounting-type.enum';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { User } from '../users/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { WorksService } from '../works/works.service';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';

@Injectable()
export class IncomesService {
  private readonly logger = new Logger(IncomesService.name);

  constructor(
    @InjectRepository(Income)
    private incomeRepository: Repository<Income>,
    @InjectRepository(Work)
    private workRepository: Repository<Work>,
    @InjectRepository(AccountingRecord)
    private accountingRepository: Repository<AccountingRecord>,
    private worksService: WorksService,
  ) {}

  async create(createIncomeDto: CreateIncomeDto, user: User): Promise<Income> {
    // Only Administration and Direction can create incomes
    if (user.role.name !== UserRole.ADMINISTRATION && user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Solo Administración y Dirección pueden crear ingresos');
    }

    const work = await this.workRepository.findOne({
      where: { id: createIncomeDto.work_id },
    });

    if (!work) {
      throw new NotFoundException(`Work with ID ${createIncomeDto.work_id} not found`);
    }

    const income = this.incomeRepository.create(createIncomeDto);
    const savedIncome = await this.incomeRepository.save(income);

    // Update work totals and progress if income is validated
    if (createIncomeDto.is_validated) {
      await this.worksService.updateWorkTotals(work.id);
      await this.worksService.updateAllProgress(work.id);
      // Create accounting record when income is validated
      await this.createAccountingRecord(savedIncome, user);
    }

    return savedIncome;
  }

  async findAll(user: User): Promise<Income[]> {
    try {
      const organizationId = getOrganizationId(user);
      const queryBuilder = this.incomeRepository
        .createQueryBuilder('income')
        .leftJoinAndSelect('income.work', 'work');

      // Filter by organization_id through work
      if (organizationId) {
        queryBuilder.where('work.organization_id = :organizationId', { organizationId });
      }

      return await queryBuilder.orderBy('income.date', 'DESC').getMany();
    } catch (error) {
      this.logger.error('Error fetching incomes', error);
      return [];
    }
  }

  async findOne(id: string, user: User): Promise<Income> {
    const organizationId = getOrganizationId(user);
    const income = await this.incomeRepository.findOne({
      where: { id },
      relations: ['work'],
    });

    if (!income) {
      throw new NotFoundException(`Income with ID ${id} not found`);
    }

    // Validate ownership through work.organization_id
    if (organizationId && income.work?.organization_id !== organizationId) {
      throw new ForbiddenException('El ingreso no pertenece a tu organización');
    }

    return income;
  }

  async update(id: string, updateIncomeDto: UpdateIncomeDto, user: User): Promise<Income> {
    const income = await this.findOne(id, user);
    
    // Validate amount is not negative
    if (updateIncomeDto.amount !== undefined && updateIncomeDto.amount < 0) {
      throw new BadRequestException('Amount cannot be negative');
    }
    
    const wasValidated = income.is_validated;
    Object.assign(income, updateIncomeDto);
    
    // Automatically update validated_by_id and validated_at when validation status changes
    if (updateIncomeDto.is_validated !== undefined && updateIncomeDto.is_validated !== wasValidated) {
      if (updateIncomeDto.is_validated) {
        // Validating: set validated_by_id and validated_at
        income.validated_by_id = user.id;
        income.validated_at = new Date();
      } else {
        // Invalidating: clear validated_by_id and validated_at
        income.validated_by_id = null;
        income.validated_at = null;
      }
    }
    
    const savedIncome = await this.incomeRepository.save(income);

    // Update work totals and progress if validation status changed
    if (wasValidated !== savedIncome.is_validated) {
      await this.worksService.updateWorkTotals(savedIncome.work_id);
      await this.worksService.updateAllProgress(savedIncome.work_id);
      
      // Create or remove accounting record based on validation status
      if (savedIncome.is_validated && !wasValidated) {
        // Income was just validated: create accounting record
        await this.createAccountingRecord(savedIncome, user);
      } else if (!savedIncome.is_validated && wasValidated) {
        // Income was invalidated: remove accounting record if exists
        await this.removeAccountingRecord(savedIncome.id);
      }
    }

    return savedIncome;
  }

  async remove(id: string, user: User): Promise<void> {
    const income = await this.findOne(id, user);
    // Remove accounting record if exists
    await this.removeAccountingRecord(income.id);
    await this.incomeRepository.remove(income);
  }

  /**
   * Business Rule: Create accounting record automatically when income is validated
   * Business Rule: Only create if income is validated
   * Business Rule: Avoid duplicates - check if record already exists
   * Business Rule: Income accounting records are always FISCAL type (income)
   */
  private async createAccountingRecord(income: Income, user: User): Promise<AccountingRecord | null> {
    // Verify that income is validated
    if (!income.is_validated) {
      return null;
    }

    // Check if accounting record already exists for this income (avoid duplicates)
    const existingRecord = await this.accountingRepository.findOne({
      where: { income_id: income.id },
    });

    if (existingRecord) {
      // Record already exists, return it
      return existingRecord;
    }

    // Get organization_id from user
    const organizationId = getOrganizationId(user);
    if (!organizationId) {
      throw new BadRequestException('Cannot create accounting record: user organization not found');
    }

    if (!income.date) {
      throw new BadRequestException('Cannot create accounting record: income date is missing');
    }
    const incomeDate = income.date instanceof Date 
      ? income.date 
      : new Date(income.date);
    
    // Build description from income data
    const description = income.observations 
      ? income.observations 
      : income.document_number
        ? `Ingreso validado - ${income.document_number}`
        : `Ingreso validado para obra ${income.work_id}`;

    const accountingRecord = this.accountingRepository.create({
      accounting_type: AccountingType.FISCAL, // Incomes are always FISCAL type
      income_id: income.id,
      work_id: income.work_id,
      supplier_id: null, // Incomes don't have suppliers
      organization_id: organizationId,
      date: incomeDate,
      month: incomeDate.getMonth() + 1,
      year: incomeDate.getFullYear(),
      document_number: income.document_number || null,
      description: description,
      amount: income.amount,
      currency: income.currency,
      vat_amount: null, // Incomes typically don't have VAT breakdown
      vat_rate: null,
      vat_perception: null,
      vat_withholding: null,
      iibb_perception: null,
      income_tax_withholding: null,
      file_url: income.file_url || null,
    });

    return await this.accountingRepository.save(accountingRecord);
  }

  /**
   * Remove accounting record when income is invalidated or deleted
   */
  private async removeAccountingRecord(incomeId: string): Promise<void> {
    const accountingRecord = await this.accountingRepository.findOne({
      where: { income_id: incomeId },
    });

    if (accountingRecord) {
      await this.accountingRepository.remove(accountingRecord);
    }
  }
}


