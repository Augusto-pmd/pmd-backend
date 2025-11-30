import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Expense } from './expenses.entity';
import { Val } from '../val/val.entity';
import { Work } from '../works/works.entity';
import { Supplier } from '../suppliers/suppliers.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ValidateExpenseDto } from './dto/validate-expense.dto';
import { ExpenseState } from '../common/enums/expense-state.enum';
import { DocumentType } from '../common/enums/document-type.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/user.entity';
import { AlertsService } from '../alerts/alerts.service';
import { AlertType, AlertSeverity } from '../common/enums';
import { AccountingRecord } from '../accounting/accounting.entity';
import { AccountingType } from '../common/enums/accounting-type.enum';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
    @InjectRepository(Val)
    private valRepository: Repository<Val>,
    @InjectRepository(Work)
    private workRepository: Repository<Work>,
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    @InjectRepository(AccountingRecord)
    private accountingRepository: Repository<AccountingRecord>,
    private dataSource: DataSource,
    private alertsService: AlertsService,
  ) {}

  /**
   * Business Rule: Work is mandatory for every expense
   * Business Rule: VAL auto-generation for non-fiscal documents
   */
  async create(createExpenseDto: CreateExpenseDto, user: User): Promise<Expense> {
    // Validate work exists
    const work = await this.workRepository.findOne({
      where: { id: createExpenseDto.work_id },
    });

    if (!work) {
      throw new NotFoundException(`Work with ID ${createExpenseDto.work_id} not found`);
    }

    // Validate supplier if provided
    if (createExpenseDto.supplier_id) {
      const supplier = await this.supplierRepository.findOne({
        where: { id: createExpenseDto.supplier_id },
        relations: ['documents'],
      });

      if (!supplier) {
        throw new NotFoundException(`Supplier with ID ${createExpenseDto.supplier_id} not found`);
      }

      // Check if supplier is blocked
      if (supplier.status === 'blocked') {
        throw new BadRequestException('Cannot create expense with blocked supplier');
      }
    }

    const expense = this.expenseRepository.create({
      ...createExpenseDto,
      created_by_id: user.id,
      state: ExpenseState.PENDING,
    });

    const savedExpense = await this.expenseRepository.save(expense);

    // Auto-generate VAL if document type is VAL or no formal document
    if (
      createExpenseDto.document_type === DocumentType.VAL ||
      !createExpenseDto.document_number
    ) {
      await this.generateVal(savedExpense);
    }

    // Check for duplicate invoices
    if (createExpenseDto.document_number) {
      await this.checkDuplicateInvoice(createExpenseDto.document_number, savedExpense.id);
    }

    // Update work total expenses
    await this.updateWorkExpenses(work.id);

    return savedExpense;
  }

  /**
   * Business Rule: VAL auto-generation with sequential codes (VAL-000001, VAL-000002, ...)
   */
  private async generateVal(expense: Expense): Promise<Val> {
    // Get the last VAL code
    const lastVal = await this.valRepository
      .createQueryBuilder('val')
      .orderBy('val.code', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastVal && lastVal.code) {
      const match = lastVal.code.match(/VAL-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const code = `VAL-${String(nextNumber).padStart(6, '0')}`;

    const val = this.valRepository.create({
      code,
      expense_id: expense.id,
    });

    return await this.valRepository.save(val);
  }

  private async checkDuplicateInvoice(documentNumber: string, expenseId: string): Promise<void> {
    const duplicate = await this.expenseRepository.findOne({
      where: {
        document_number: documentNumber,
        state: ExpenseState.VALIDATED,
      },
    });

    if (duplicate && duplicate.id !== expenseId) {
      await this.alertsService.createAlert({
        type: AlertType.DUPLICATE_INVOICE,
        severity: AlertSeverity.WARNING,
        title: 'Duplicate invoice detected',
        message: `Invoice ${documentNumber} appears to be duplicated`,
        expense_id: expenseId,
      });
    }
  }

  /**
   * Business Rule: Administration validation flow
   */
  async validate(
    id: string,
    validateDto: ValidateExpenseDto,
    user: User,
  ): Promise<Expense> {
    // Only Administration and Direction can validate
    if (
      user.role.name !== UserRole.ADMINISTRATION &&
      user.role.name !== UserRole.DIRECTION
    ) {
      throw new ForbiddenException('Only Administration and Direction can validate expenses');
    }

    const expense = await this.findOne(id, user);

    if (expense.state === ExpenseState.ANNULLED) {
      throw new BadRequestException('Cannot validate an annulled expense');
    }

    expense.state = validateDto.state;
    expense.validated_by_id = user.id;
    expense.validated_at = new Date();
    if (validateDto.observations) {
      expense.observations = validateDto.observations;
    }

    const savedExpense = await this.expenseRepository.save(expense);

    // If validated, create accounting record and update work
    if (validateDto.state === ExpenseState.VALIDATED) {
      await this.createAccountingRecord(savedExpense);
      await this.updateWorkExpenses(expense.work_id);

      // Check if contract needs to be updated
      if (expense.supplier_id) {
        await this.updateContractExecution(expense);
      }
    } else if (validateDto.state === ExpenseState.OBSERVED) {
      // Generate alert for observed expense
      await this.alertsService.createAlert({
        type: AlertType.OBSERVED_EXPENSE,
        severity: AlertSeverity.WARNING,
        title: 'Expense observed',
        message: `Expense ${expense.id} has been observed: ${validateDto.observations || 'No details'}`,
        expense_id: expense.id,
        user_id: expense.created_by_id,
      });
    }

    return savedExpense;
  }

  private async createAccountingRecord(expense: Expense): Promise<void> {
    const purchaseDate = new Date(expense.purchase_date);
    const accountingRecord = this.accountingRepository.create({
      accounting_type: expense.document_type === DocumentType.VAL
        ? AccountingType.CASH
        : AccountingType.FISCAL,
      expense_id: expense.id,
      work_id: expense.work_id,
      supplier_id: expense.supplier_id,
      date: purchaseDate,
      month: purchaseDate.getMonth() + 1,
      year: purchaseDate.getFullYear(),
      document_number: expense.document_number,
      description: `Expense for work ${expense.work_id}`,
      amount: expense.amount,
      currency: expense.currency,
      vat_amount: expense.vat_amount,
      vat_rate: expense.vat_rate,
      vat_perception: expense.vat_perception,
      vat_withholding: expense.vat_withholding,
      iibb_perception: expense.iibb_perception,
      income_tax_withholding: expense.income_tax_withholding,
    });

    await this.accountingRepository.save(accountingRecord);
  }

  private async updateContractExecution(expense: Expense): Promise<void> {
    // This would update contract amount_executed
    // Implementation depends on contract relationship with expenses
  }

  private async updateWorkExpenses(workId: string): Promise<void> {
    const work = await this.workRepository.findOne({ where: { id: workId } });
    if (!work) return;

    const totalExpenses = await this.expenseRepository
      .createQueryBuilder('expense')
      .where('expense.work_id = :workId', { workId })
      .andWhere('expense.state = :state', { state: ExpenseState.VALIDATED })
      .select('SUM(expense.amount)', 'total')
      .getRawOne();

    work.total_expenses = parseFloat(totalExpenses?.total || '0');
    await this.workRepository.save(work);
  }

  async findAll(user: User): Promise<Expense[]> {
    const queryBuilder = this.expenseRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.work', 'work')
      .leftJoinAndSelect('expense.supplier', 'supplier')
      .leftJoinAndSelect('expense.rubric', 'rubric')
      .leftJoinAndSelect('expense.created_by', 'created_by')
      .leftJoinAndSelect('expense.val', 'val')
      .orderBy('expense.created_at', 'DESC');

    // Operators can only see their own expenses
    if (user.role.name === UserRole.OPERATOR) {
      queryBuilder.where('expense.created_by_id = :userId', { userId: user.id });
    }

    return await queryBuilder.getMany();
  }

  async findOne(id: string, user: User): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({
      where: { id },
      relations: ['work', 'supplier', 'rubric', 'created_by', 'val'],
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    // Operators can only access their own expenses
    if (user.role.name === UserRole.OPERATOR && expense.created_by_id !== user.id) {
      throw new ForbiddenException('You can only access your own expenses');
    }

    return expense;
  }

  async update(id: string, updateExpenseDto: UpdateExpenseDto, user: User): Promise<Expense> {
    const expense = await this.findOne(id, user);

    // Only Administration and Direction can edit validated expenses
    if (
      expense.state === ExpenseState.VALIDATED &&
      user.role.name !== UserRole.ADMINISTRATION &&
      user.role.name !== UserRole.DIRECTION
    ) {
      throw new ForbiddenException('Only Administration and Direction can edit validated expenses');
    }

    Object.assign(expense, updateExpenseDto);
    return await this.expenseRepository.save(expense);
  }

  async remove(id: string, user: User): Promise<void> {
    // Only Direction can delete expenses
    if (user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Only Direction can delete expenses');
    }

    const expense = await this.findOne(id, user);
    await this.expenseRepository.remove(expense);
  }
}

