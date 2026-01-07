import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
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
import { RejectExpenseDto } from './dto/reject-expense.dto';
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
import { ContractStatus } from '../common/enums/contract-status.enum';
import { SupplierDocument } from '../supplier-documents/supplier-documents.entity';
import { SupplierDocumentType } from '../common/enums/supplier-document-type.enum';
import { SupplierStatus } from '../common/enums/supplier-status.enum';
import { WorksService } from '../works/works.service';
import { WorkStatus } from '../common/enums/work-status.enum';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';
import { CalculationsService } from '../accounting/calculations.service';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

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
    private calculationsService: CalculationsService,
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

    // Check if work is closed
    const isWorkClosed =
      work.status === WorkStatus.FINISHED ||
      work.status === WorkStatus.ADMINISTRATIVELY_CLOSED ||
      work.status === WorkStatus.ARCHIVED;

    if (isWorkClosed) {
      // Check if post-closure expenses are allowed
      if (!work.allow_post_closure_expenses) {
        if (user.role.name !== UserRole.DIRECTION) {
          throw new BadRequestException(
            'Cannot create expense in a closed work. Post-closure expenses are not enabled for this work. Only Direction can create expenses in closed works without post-closure enabled.',
          );
        }
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

    // Determine if this is a post-closure expense
    const isPostClosure = isWorkClosed && work.allow_post_closure_expenses;

    // Get supplier with fiscal condition for automatic tax calculation
    let supplier: Supplier | null = null;
    if (createExpenseDto.supplier_id) {
      supplier = await this.supplierRepository.findOne({
        where: { id: createExpenseDto.supplier_id },
      });
    }

    // Calculate automatic perceptions and withholdings if not manually provided
    let taxCalculations = null;
    if (
      !createExpenseDto.vat_perception &&
      !createExpenseDto.vat_withholding &&
      !createExpenseDto.iibb_perception &&
      !createExpenseDto.income_tax_withholding &&
      supplier?.fiscal_condition
    ) {
      taxCalculations = this.calculationsService.calculateTaxes(
        createExpenseDto.amount,
        supplier.fiscal_condition,
        createExpenseDto.document_type,
      );
    }

    const expense = this.expenseRepository.create({
      ...createExpenseDto,
      created_by_id: user.id,
      state: ExpenseState.PENDING,
      is_post_closure: isPostClosure,
      // Use automatic calculations if available, otherwise use manual values
      vat_perception: createExpenseDto.vat_perception ?? taxCalculations?.vat_perception ?? null,
      vat_withholding: createExpenseDto.vat_withholding ?? taxCalculations?.vat_withholding ?? null,
      iibb_perception: createExpenseDto.iibb_perception ?? taxCalculations?.iibb_perception ?? null,
      income_tax_withholding:
        createExpenseDto.income_tax_withholding ?? taxCalculations?.income_tax_withholding ?? null,
    });

    const savedExpense = await this.expenseRepository.save(expense);

    // Generate alert if post-closure expense
    if (isPostClosure) {
      await this.alertsService.createAlert({
        type: AlertType.POST_CLOSURE_EXPENSE,
        severity: AlertSeverity.WARNING,
        title: 'Post-closure expense created',
        message: `Expense ${savedExpense.document_number || savedExpense.id} was created after work closure. Work: ${work.name}`,
        expense_id: savedExpense.id,
        work_id: work.id,
        user_id: user.id,
      });
    }

    // Auto-generate VAL only if document type is VAL
    if (createExpenseDto.document_type === DocumentType.VAL) {
      await this.generateVal(savedExpense);
    }

    // Check for duplicate invoices (only generates alert, doesn't block creation)
    if (createExpenseDto.document_number && createExpenseDto.supplier_id) {
      await this.checkDuplicateInvoice(
        createExpenseDto.document_number,
        createExpenseDto.supplier_id,
        createExpenseDto.purchase_date,
        savedExpense.id,
      );
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

  /**
   * Business Rule: Check for duplicate invoices
   * Business Rule: Validate by CUIT of supplier + invoice number + date
   * Business Rule: Generate alert if duplicate detected
   * Business Rule: Block validation if duplicate confirmed (except Direction)
   */
  private async checkDuplicateInvoice(
    documentNumber: string,
    supplierId: string,
    purchaseDate: string,
    expenseId: string,
  ): Promise<{ isDuplicate: boolean; duplicateExpense?: Expense }> {
    const purchaseDateObj = new Date(purchaseDate);
    
    // Find duplicate by supplier CUIT + document number + date
    const duplicate = await this.expenseRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.supplier', 'supplier')
      .where('expense.document_number = :documentNumber', { documentNumber })
      .andWhere('expense.supplier_id = :supplierId', { supplierId })
      .andWhere('expense.id != :expenseId', { expenseId })
      .andWhere('DATE(expense.purchase_date) = DATE(:purchaseDate)', { 
        purchaseDate: purchaseDateObj 
      })
      .andWhere('expense.state IN (:...states)', { 
        states: [ExpenseState.VALIDATED, ExpenseState.PENDING] 
      })
      .getOne();

    if (duplicate) {
      // Generate alert
      await this.alertsService.createAlert({
        type: AlertType.DUPLICATE_INVOICE,
        severity: AlertSeverity.WARNING,
        title: 'Duplicate invoice detected',
        message: `Invoice ${documentNumber} from supplier ${duplicate.supplier?.name || supplierId} appears to be duplicated. Found on date ${purchaseDate}`,
        expense_id: expenseId,
        supplier_id: supplierId,
      });

      return { isDuplicate: true, duplicateExpense: duplicate };
    }

    return { isDuplicate: false };
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
      throw new ForbiddenException('Solo Administración y Dirección pueden validar gastos');
    }

    const expense = await this.findOne(id, user);

    if (expense.state === ExpenseState.ANNULLED) {
      throw new BadRequestException('Cannot validate an annulled expense');
    }

    if (expense.state === ExpenseState.REJECTED) {
      throw new BadRequestException('Cannot validate a rejected expense');
    }

    // Check for duplicate invoices before validation
    if (expense.document_number && expense.supplier_id && validateDto.state === ExpenseState.VALIDATED && expense.purchase_date) {
      const purchaseDateStr = expense.purchase_date instanceof Date 
        ? expense.purchase_date.toISOString().split('T')[0]
        : typeof expense.purchase_date === 'string'
        ? expense.purchase_date.split('T')[0]
        : new Date(expense.purchase_date).toISOString().split('T')[0];
      
      const duplicateCheck = await this.checkDuplicateInvoice(
        expense.document_number,
        expense.supplier_id,
        purchaseDateStr,
        expense.id,
      );

      // Block validation if duplicate confirmed (except Direction)
      if (duplicateCheck.isDuplicate && user.role.name !== UserRole.DIRECTION) {
        throw new BadRequestException(
          `Cannot validate expense: duplicate invoice detected. Invoice ${expense.document_number} from the same supplier on the same date already exists. Only Direction can override this restriction.`,
        );
      }
    }

    // Use transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Save original state BEFORE changing it (for reversal logic)
      const originalState = expense.state;
      const wasValidated = originalState === ExpenseState.VALIDATED;
      const isBeingRejected =
        validateDto.state === ExpenseState.OBSERVED ||
        validateDto.state === ExpenseState.ANNULLED;

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

          // 3. Validar que el contrato tenga saldo disponible (only if validating, not if rejecting)
          if (validateDto.state === ExpenseState.VALIDATED) {
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
      }

      expense.state = validateDto.state;
      expense.validated_by_id = user.id;
      expense.validated_at = new Date();
      if (validateDto.observations) {
        expense.observations = validateDto.observations;
      }

      // If expense was previously validated and is now being rejected/observed/annulled, revert contract balance
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
          
          // Update contract status after reverting balance
          const amountTotal = Number(existingContract.amount_total);
          const amountExecuted = Number(existingContract.amount_executed);
          const saldo = amountTotal - amountExecuted;
          
          // If balance is restored, update status accordingly
          if (saldo > 0) {
            const balancePercentage = (saldo / amountTotal) * 100;
            if (balancePercentage < 10) {
              if (existingContract.status !== ContractStatus.CANCELLED && existingContract.status !== ContractStatus.FINISHED && existingContract.status !== ContractStatus.PAUSED) {
                existingContract.status = ContractStatus.LOW_BALANCE;
              }
            } else {
              if (existingContract.status === ContractStatus.NO_BALANCE || existingContract.status === ContractStatus.LOW_BALANCE) {
                existingContract.status = ContractStatus.ACTIVE;
              }
            }
            // Unblock contract if balance was restored
            if (existingContract.is_blocked && saldo > 0) {
              existingContract.is_blocked = false;
            }
          } else {
            existingContract.status = ContractStatus.NO_BALANCE;
          }
          
          await queryRunner.manager.save(Contract, existingContract);
        }
      }

      const savedExpense = await queryRunner.manager.save(Expense, expense);

      // If validated, create accounting record, update work, and update contract
      if (validateDto.state === ExpenseState.VALIDATED) {
        await this.createAccountingRecord(savedExpense, user);
        await this.updateWorkExpenses(expense.work_id);

        // 5. Actualizar amount_executed del contrato usando el método centralizado (only if not already updated above)
        if (contract && savedExpense.contract_id && !wasValidated) {
          const newAmountExecuted =
            Number(contract.amount_executed) + Number(expense.amount);
          
          // Use centralized method to update amount_executed, which handles auto-blocking and status updates
          await this.contractsService.updateAmountExecuted(
            contract.id,
            newAmountExecuted,
            queryRunner,
          );
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

    if (!expense.purchase_date) {
      throw new BadRequestException('Cannot create accounting record: expense purchase_date is missing');
    }
    const purchaseDate = expense.purchase_date instanceof Date 
      ? expense.purchase_date 
      : new Date(expense.purchase_date);
    
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
    // Also update all progress indicators
    await this.worksService.updateAllProgress(workId);
  }

  async findAll(user: User): Promise<Expense[]> {
    try {
      const organizationId = getOrganizationId(user);
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
      } else {
        // Filter by organization for other roles through work
        if (organizationId) {
          queryBuilder.where('work.organization_id = :organizationId', { organizationId });
        }
      }

      return await queryBuilder.getMany();
    } catch (error) {
      this.logger.error('Error fetching expenses', error);
      return [];
    }
  }

  async findOne(id: string, user: User): Promise<Expense> {
    const organizationId = getOrganizationId(user);
    const expense = await this.expenseRepository.findOne({
      where: { id },
      relations: ['work', 'supplier', 'rubric', 'created_by', 'val'],
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    // Validate ownership through work.organization_id
    if (organizationId && expense.work?.organization_id !== organizationId) {
      throw new ForbiddenException('El gasto no pertenece a tu organización');
    }

    // Operators can only access their own expenses
    if (user.role.name === UserRole.OPERATOR && expense.created_by_id !== user.id) {
      throw new ForbiddenException('Solo puedes acceder a tus propios gastos');
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
      throw new ForbiddenException('Solo Administración y Dirección pueden editar gastos validados');
    }

    // Validate amounts are not negative
    if (updateExpenseDto.amount !== undefined && updateExpenseDto.amount < 0) {
      throw new BadRequestException('Amount cannot be negative');
    }
    if (updateExpenseDto.vat_amount !== undefined && updateExpenseDto.vat_amount < 0) {
      throw new BadRequestException('VAT amount cannot be negative');
    }
    if (updateExpenseDto.vat_perception !== undefined && updateExpenseDto.vat_perception < 0) {
      throw new BadRequestException('VAT perception cannot be negative');
    }
    if (updateExpenseDto.vat_withholding !== undefined && updateExpenseDto.vat_withholding < 0) {
      throw new BadRequestException('VAT withholding cannot be negative');
    }
    if (updateExpenseDto.iibb_perception !== undefined && updateExpenseDto.iibb_perception < 0) {
      throw new BadRequestException('IIBB perception cannot be negative');
    }
    if (updateExpenseDto.income_tax_withholding !== undefined && updateExpenseDto.income_tax_withholding < 0) {
      throw new BadRequestException('Income tax withholding cannot be negative');
    }

    // Validate manual tax calculations if provided
    if (
      updateExpenseDto.vat_perception !== undefined ||
      updateExpenseDto.vat_withholding !== undefined ||
      updateExpenseDto.iibb_perception !== undefined ||
      updateExpenseDto.income_tax_withholding !== undefined
    ) {
      const validation = this.calculationsService.validateTaxCalculations(
        updateExpenseDto.amount ?? expense.amount,
        updateExpenseDto.vat_perception,
        updateExpenseDto.vat_withholding,
        updateExpenseDto.iibb_perception,
        updateExpenseDto.income_tax_withholding,
      );
      if (!validation.isValid) {
        throw new BadRequestException(validation.errors.join('; '));
      }
    }

    // Recalculate taxes automatically if amount, supplier, or document_type changes
    // but only if taxes are not being manually updated
    const shouldRecalculate =
      (updateExpenseDto.amount !== undefined ||
        updateExpenseDto.supplier_id !== undefined ||
        updateExpenseDto.document_type !== undefined) &&
      updateExpenseDto.vat_perception === undefined &&
      updateExpenseDto.vat_withholding === undefined &&
      updateExpenseDto.iibb_perception === undefined &&
      updateExpenseDto.income_tax_withholding === undefined;

    if (shouldRecalculate) {
      // Get updated supplier
      const supplierId = updateExpenseDto.supplier_id ?? expense.supplier_id;
      let supplier: Supplier | null = null;
      if (supplierId) {
        supplier = await this.supplierRepository.findOne({
          where: { id: supplierId },
        });
      }

      if (supplier?.fiscal_condition) {
        const newAmount = updateExpenseDto.amount ?? expense.amount;
        const newDocumentType = updateExpenseDto.document_type ?? expense.document_type;
        const taxCalculations = this.calculationsService.calculateTaxes(
          newAmount,
          supplier.fiscal_condition,
          newDocumentType,
        );

        // Update taxes with automatic calculations
        updateExpenseDto.vat_perception = taxCalculations.vat_perception;
        updateExpenseDto.vat_withholding = taxCalculations.vat_withholding;
        updateExpenseDto.iibb_perception = taxCalculations.iibb_perception;
        updateExpenseDto.income_tax_withholding = taxCalculations.income_tax_withholding;
      }
    }

    Object.assign(expense, updateExpenseDto);
    return await this.expenseRepository.save(expense);
  }

  /**
   * Business Rule: Reject expense
   * Business Rule: Only Administration and Direction can reject
   * Business Rule: Observations are mandatory when rejecting
   * Business Rule: If expense was validated and had contract_id, revert contract balance
   */
  async reject(id: string, rejectDto: RejectExpenseDto, user: User): Promise<Expense> {
    // Only Administration and Direction can reject
    if (
      user.role.name !== UserRole.ADMINISTRATION &&
      user.role.name !== UserRole.DIRECTION
    ) {
      throw new ForbiddenException('Solo Administración y Dirección pueden rechazar gastos');
    }

    const expense = await this.findOne(id, user);

    if (expense.state === ExpenseState.ANNULLED) {
      throw new BadRequestException('Cannot reject an annulled expense');
    }

    if (expense.state === ExpenseState.REJECTED) {
      throw new BadRequestException('Expense is already rejected');
    }

    // Use transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wasValidated = expense.state === ExpenseState.VALIDATED;

      // If expense was validated and had contract_id, revert contract balance
      if (wasValidated && expense.contract_id) {
        const contract = await queryRunner.manager.findOne(Contract, {
          where: { id: expense.contract_id },
        });

        if (contract) {
          // Revert contract balance: subtract expense amount from amount_executed
          contract.amount_executed = Math.max(
            0,
            Number(contract.amount_executed) - Number(expense.amount),
          );
          await queryRunner.manager.save(Contract, contract);
        }
      }

      // Update expense state to REJECTED
      expense.state = ExpenseState.REJECTED;
      expense.validated_by_id = user.id;
      expense.validated_at = new Date();
      expense.observations = rejectDto.observations;

      const savedExpense = await queryRunner.manager.save(Expense, expense);

      // Update work totals if expense was validated
      if (wasValidated) {
        await this.updateWorkExpenses(expense.work_id);
      }

      // Generate alert
      await this.alertsService.createAlert({
        type: AlertType.REJECTED_EXPENSE,
        severity: AlertSeverity.WARNING,
        title: 'Expense rejected',
        message: `Expense ${expense.document_number || expense.id} has been rejected: ${rejectDto.observations}`,
        expense_id: expense.id,
        user_id: user.id,
      });

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
      this.logger.error('Error rejecting expense', error);
      throw error;
    }
  }

  async remove(id: string, user: User): Promise<void> {
    // Only Direction can delete expenses
    if (user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Solo Dirección puede eliminar gastos');
    }

    const expense = await this.findOne(id, user);
    await this.expenseRepository.remove(expense);
  }
}

