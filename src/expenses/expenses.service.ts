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
import { Contract } from '../contracts/contracts.entity';
import { ContractsService } from '../contracts/contracts.service';
import { SupplierDocument } from '../supplier-documents/supplier-documents.entity';
import { SupplierDocumentType } from '../common/enums/supplier-document-type.enum';
import { SupplierStatus } from '../common/enums/supplier-status.enum';
import { WorksService } from '../works/works.service';
import { WorkStatus } from '../common/enums/work-status.enum';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';

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
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>,
    @InjectRepository(AccountingRecord)
    private accountingRepository: Repository<AccountingRecord>,
    @InjectRepository(SupplierDocument)
    private supplierDocumentRepository: Repository<SupplierDocument>,
    private dataSource: DataSource,
    private alertsService: AlertsService,
    private contractsService: ContractsService,
    private worksService: WorksService,
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

    // Check if work is closed (only Direction can create expenses in closed works)
    if (
      work.status === WorkStatus.FINISHED ||
      work.status === WorkStatus.ADMINISTRATIVELY_CLOSED ||
      work.status === WorkStatus.ARCHIVED
    ) {
      if (user.role.name !== UserRole.DIRECTION) {
        throw new BadRequestException(
          'Cannot create expense in a closed work. Only Direction can create expenses in closed works.',
        );
      }
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
      if (supplier.status === SupplierStatus.BLOCKED) {
        throw new BadRequestException('Cannot create expense with blocked supplier');
      }

      // Check ART expiration before creating expense
      // This ensures we catch expired ART even if checkAndBlockExpiredDocuments hasn't run yet
      const artDoc = supplier.documents?.find(
        (doc) => doc.document_type === SupplierDocumentType.ART && doc.is_valid === true,
      );

      if (artDoc && artDoc.expiration_date) {
        const expirationDate = new Date(artDoc.expiration_date);
        expirationDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (expirationDate < today) {
          // ART is expired, block supplier and prevent expense creation
          supplier.status = SupplierStatus.BLOCKED;
          await this.supplierRepository.save(supplier);

          // Mark document as invalid
          artDoc.is_valid = false;
          await this.supplierDocumentRepository.save(artDoc);

          // Generate critical alert
          await this.alertsService.createAlert({
            type: AlertType.EXPIRED_DOCUMENTATION,
            severity: AlertSeverity.CRITICAL,
            title: 'Supplier blocked due to expired ART',
            message: `Supplier ${supplier.name} has been automatically blocked due to expired ART (expired: ${artDoc.expiration_date}). Cannot create expense.`,
            supplier_id: supplier.id,
          });

          throw new BadRequestException(
            `Cannot create expense with supplier that has expired ART. Supplier has been automatically blocked. Please update ART document first.`,
          );
        }
      }
    }

    const expense = this.expenseRepository.create({
      ...createExpenseDto,
      created_by_id: user.id,
      state: ExpenseState.PENDING,
    });

    const savedExpense = await this.expenseRepository.save(expense);

    // Auto-generate VAL only if document type is VAL
    if (createExpenseDto.document_type === DocumentType.VAL) {
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
   * Business Rule: VAL is generated only if document_type === DocumentType.VAL
   * Business Rule: Numeración is sequential and unique
   * Business Rule: Format: VAL-XXXXXX (6 digits padded with zeros)
   */
  private async generateVal(expense: Expense): Promise<Val> {
    // Verify that expense has document_type VAL
    if (expense.document_type !== DocumentType.VAL) {
      throw new BadRequestException('VAL can only be generated for expenses with document_type VAL');
    }

    // Check if VAL already exists for this expense
    const existingVal = await this.valRepository.findOne({
      where: { expense_id: expense.id },
    });

    if (existingVal) {
      // VAL already exists, return it
      return existingVal;
    }

    // Get the last VAL code to ensure sequential numbering
    const lastVal = await this.valRepository
      .createQueryBuilder('val')
      .orderBy('val.code', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastVal && lastVal.code) {
      // Extract number from format VAL-XXXXXX
      const match = lastVal.code.match(/^VAL-(\d+)$/);
      if (match) {
        const lastNumber = parseInt(match[1], 10);
        if (!isNaN(lastNumber) && lastNumber > 0) {
          nextNumber = lastNumber + 1;
        }
      }
    }

    // Generate code with format VAL-XXXXXX (6 digits padded with zeros)
    const code = `VAL-${String(nextNumber).padStart(6, '0')}`;

    // Verify code doesn't already exist (race condition protection)
    const existingCode = await this.valRepository.findOne({
      where: { code },
    });

    if (existingCode) {
      // If code exists, find the next available number
      const allVals = await this.valRepository
        .createQueryBuilder('val')
        .orderBy('val.code', 'DESC')
        .getMany();

      let maxNumber = 0;
      for (const val of allVals) {
        const match = val.code.match(/^VAL-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
      nextNumber = maxNumber + 1;
    }

    const finalCode = `VAL-${String(nextNumber).padStart(6, '0')}`;

    const val = this.valRepository.create({
      code: finalCode,
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
   * Business Rule: Auto-assign contract if exists for supplier in work
   * Business Rule: Validate contract balance before validation
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

    // Use transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Buscar contrato del proveedor en la obra
      let contract: Contract | null = null;
      if (expense.supplier_id && expense.work_id) {
        contract = await queryRunner.manager.findOne(Contract, {
          where: {
            supplier_id: expense.supplier_id,
            work_id: expense.work_id,
            is_blocked: false,
          },
        });

        // 2. Si existe contrato, asignar automáticamente contract_id
        if (contract) {
          expense.contract_id = contract.id;

          // 3. Validar que el contrato tenga saldo disponible
          const amountTotal = Number(contract.amount_total);
          const amountExecuted = Number(contract.amount_executed);
          const expenseAmount = Number(expense.amount);
          const availableBalance = amountTotal - amountExecuted;

          // 4. Si no hay saldo, bloquear y alertar
          if (availableBalance < expenseAmount) {
            await queryRunner.rollbackTransaction();
            await queryRunner.release();

            // Generate alert
            await this.alertsService.createAlert({
              type: AlertType.CONTRACT_INSUFFICIENT_BALANCE,
              severity: AlertSeverity.CRITICAL,
              title: 'Insufficient contract balance',
              message: `Contract ${contract.id} has insufficient balance. Available: ${availableBalance.toFixed(2)}, Required: ${expenseAmount.toFixed(2)}`,
              contract_id: contract.id,
              expense_id: expense.id,
              user_id: user.id,
            });

            throw new BadRequestException(
              `Contract has insufficient balance. Available: ${availableBalance.toFixed(2)}, Required: ${expenseAmount.toFixed(2)}`,
            );
          }
        }
      }

      expense.state = validateDto.state;
      expense.validated_by_id = user.id;
      expense.validated_at = new Date();
      if (validateDto.observations) {
        expense.observations = validateDto.observations;
      }

      // Check if expense was previously validated and is now being rejected/observed/annulled
      const wasValidated = expense.state === ExpenseState.VALIDATED;
      const isBeingRejected =
        validateDto.state === ExpenseState.OBSERVED ||
        validateDto.state === ExpenseState.ANNULLED;

      // If expense was validated and is now being rejected, revert contract balance
      if (wasValidated && isBeingRejected && expense.contract_id) {
        const existingContract = await queryRunner.manager.findOne(Contract, {
          where: { id: expense.contract_id },
        });

        if (existingContract) {
          // Revert contract balance: subtract expense amount from amount_executed
          existingContract.amount_executed = Math.max(
            0,
            Number(existingContract.amount_executed) - Number(expense.amount),
          );
          await queryRunner.manager.save(Contract, existingContract);
        }
      }

      const savedExpense = await queryRunner.manager.save(Expense, expense);

      // If validated, create accounting record, update work, and update contract
      if (validateDto.state === ExpenseState.VALIDATED) {
        await this.createAccountingRecord(savedExpense, user);
        await this.updateWorkExpenses(expense.work_id);

        // 5. Actualizar amount_executed del contrato (only if not already updated above)
        if (contract && savedExpense.contract_id && !wasValidated) {
          const newAmountExecuted =
            Number(contract.amount_executed) + Number(expense.amount);
          
          // Update amount_executed
          contract.amount_executed = newAmountExecuted;
          
          // Calculate saldo: amount_total - amount_executed
          const saldo = Number(contract.amount_total) - newAmountExecuted;
          
          // Auto-block if saldo <= 0 (amount_executed >= amount_total)
          if (saldo <= 0 && !contract.is_blocked) {
            contract.is_blocked = true;
            
            // Generate alert
            await this.alertsService.createAlert({
              type: AlertType.CONTRACT_ZERO_BALANCE,
              severity: AlertSeverity.WARNING,
              title: 'Contract balance reached zero',
              message: `Contract ${contract.id} has been automatically blocked. Saldo: ${saldo.toFixed(2)} (amount_total: ${contract.amount_total.toFixed(2)}, amount_executed: ${newAmountExecuted.toFixed(2)})`,
              contract_id: contract.id,
              work_id: contract.work_id,
            });
          }
          
          await queryRunner.manager.save(Contract, contract);
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

      await queryRunner.commitTransaction();
      await queryRunner.release();

      // Return expense with relations loaded
      return await this.expenseRepository.findOne({
        where: { id: savedExpense.id },
        relations: ['work', 'supplier', 'rubric', 'created_by', 'val', 'contract'],
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      throw error;
    }
  }

  /**
   * Business Rule: Create accounting record automatically when expense is validated
   * Business Rule: Only create if expense is validated
   * Business Rule: Avoid duplicates - check if record already exists
   * Business Rule: Copy all relevant data from expense (amount, IVA, perceptions, etc.)
   */
  private async createAccountingRecord(expense: Expense, user: User): Promise<AccountingRecord | null> {
    // Verify that expense is validated
    if (expense.state !== ExpenseState.VALIDATED) {
      return null;
    }

    // Check if accounting record already exists for this expense (avoid duplicates)
    const existingRecord = await this.accountingRepository.findOne({
      where: { expense_id: expense.id },
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

    const purchaseDate = new Date(expense.purchase_date);
    
    // Build description from expense data
    const description = expense.observations 
      ? expense.observations 
      : expense.supplier_id 
        ? `Gasto validado - ${expense.document_number || 'Sin número de documento'}`
        : `Gasto validado para obra ${expense.work_id}`;

    const accountingRecord = this.accountingRepository.create({
      accounting_type: expense.document_type === DocumentType.VAL
        ? AccountingType.CASH
        : AccountingType.FISCAL,
      expense_id: expense.id,
      work_id: expense.work_id,
      supplier_id: expense.supplier_id || null,
      organization_id: organizationId,
      date: purchaseDate,
      month: purchaseDate.getMonth() + 1,
      year: purchaseDate.getFullYear(),
      document_number: expense.document_number || null,
      description: description,
      amount: expense.amount,
      currency: expense.currency,
      vat_amount: expense.vat_amount || null,
      vat_rate: expense.vat_rate || null,
      vat_perception: expense.vat_perception || null,
      vat_withholding: expense.vat_withholding || null,
      iibb_perception: expense.iibb_perception || null,
      income_tax_withholding: expense.income_tax_withholding || null,
      file_url: expense.file_url || null,
    });

    return await this.accountingRepository.save(accountingRecord);
  }


  private async updateWorkExpenses(workId: string): Promise<void> {
    // Use WorksService to update work totals (includes both expenses and incomes)
    await this.worksService.updateWorkTotals(workId);
  }

  async findAll(user: User): Promise<Expense[]> {
    try {
      const queryBuilder = this.expenseRepository
        .createQueryBuilder('expense')
        .leftJoinAndSelect('expense.work', 'work')
        .leftJoinAndSelect('expense.supplier', 'supplier')
        .leftJoinAndSelect('expense.rubric', 'rubric')
        .leftJoinAndSelect('expense.created_by', 'created_by')
        .leftJoinAndSelect('expense.val', 'val')
        .orderBy('expense.created_at', 'DESC');

      // Operators can only see their own expenses
      if (user?.role?.name === UserRole.OPERATOR) {
        queryBuilder.where('expense.created_by_id = :userId', { userId: user.id });
      }

      return await queryBuilder.getMany();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[ExpensesService.findAll] Error:', error);
      }
      return [];
    }
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

