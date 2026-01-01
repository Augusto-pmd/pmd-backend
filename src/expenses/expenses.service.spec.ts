import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { Expense } from './expenses.entity';
import { Val } from '../val/val.entity';
import { Work } from '../works/works.entity';
import { Supplier } from '../suppliers/suppliers.entity';
import { Contract } from '../contracts/contracts.entity';
import { AccountingRecord } from '../accounting/accounting.entity';
import { SupplierDocument } from '../supplier-documents/supplier-documents.entity';
import { AlertsService } from '../alerts/alerts.service';
import { ContractsService } from '../contracts/contracts.service';
import { WorksService } from '../works/works.service';
import { CalculationsService } from '../accounting/calculations.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ValidateExpenseDto } from './dto/validate-expense.dto';
import { User } from '../users/user.entity';
import {
  Currency,
  ExpenseState,
  DocumentType,
  UserRole,
  WorkStatus,
  SupplierStatus,
  SupplierDocumentType,
} from '../common/enums';
import { createMockUser } from '../common/test/test-helpers';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let expenseRepository: Repository<Expense>;
  let valRepository: Repository<Val>;
  let workRepository: Repository<Work>;
  let supplierRepository: Repository<Supplier>;
  let contractRepository: Repository<Contract>;
  let accountingRepository: Repository<AccountingRecord>;
  let alertsService: AlertsService;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const mockExpenseRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
    })),
  };

  const mockValRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    })),
  };

  const mockWorkRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockSupplierRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockSupplierDocumentRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockContractRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockAccountingRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockAlertsService = {
    createAlert: jest.fn(),
  };

  const mockContractsService = {
    updateAmountExecuted: jest.fn(),
  };

  const mockWorksService = {
    updateWorkTotals: jest.fn(),
    updateAllProgress: jest.fn(),
  };

  const mockCalculationsService = {
    calculateWorkTotals: jest.fn(),
  };

  // Mock QueryRunner
  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    },
  };

  // Mock DataSource
  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  const mockWork: Work = {
    id: 'work-id',
    name: 'Test Work',
    client: 'Test Client',
    address: 'Test Address',
    start_date: new Date(),
    end_date: null,
    status: WorkStatus.ACTIVE,
    currency: Currency.ARS,
    work_type: null,
    supervisor_id: null,
    supervisor: null,
    organization_id: null,
    organization: null,
    total_budget: 100000,
    total_expenses: 0,
    total_incomes: 0,
    physical_progress: 0,
    economic_progress: 0,
    financial_progress: 0,
    allow_post_closure_expenses: false,
    post_closure_enabled_by_id: null,
    post_closure_enabled_by: null,
    post_closure_enabled_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    budgets: [],
    contracts: [],
    expenses: [],
    incomes: [],
    schedules: [],
    documents: [],
  };

  const mockSupplier: Supplier = {
    id: 'supplier-id',
    name: 'Test Supplier',
    status: 'approved',
    created_at: new Date(),
    updated_at: new Date(),
    documents: [],
    contracts: [],
    expenses: [],
  } as Supplier;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        {
          provide: getRepositoryToken(Expense),
          useValue: mockExpenseRepository,
        },
        {
          provide: getRepositoryToken(Val),
          useValue: mockValRepository,
        },
        {
          provide: getRepositoryToken(Work),
          useValue: mockWorkRepository,
        },
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockSupplierRepository,
        },
        {
          provide: getRepositoryToken(Contract),
          useValue: mockContractRepository,
        },
        {
          provide: getRepositoryToken(AccountingRecord),
          useValue: mockAccountingRepository,
        },
        {
          provide: getRepositoryToken(SupplierDocument),
          useValue: mockSupplierDocumentRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: AlertsService,
          useValue: mockAlertsService,
        },
        {
          provide: ContractsService,
          useValue: mockContractsService,
        },
        {
          provide: WorksService,
          useValue: mockWorksService,
        },
        {
          provide: CalculationsService,
          useValue: mockCalculationsService,
        },
      ],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);
    expenseRepository = module.get<Repository<Expense>>(getRepositoryToken(Expense));
    valRepository = module.get<Repository<Val>>(getRepositoryToken(Val));
    workRepository = module.get<Repository<Work>>(getRepositoryToken(Work));
    supplierRepository = module.get<Repository<Supplier>>(getRepositoryToken(Supplier));
    contractRepository = module.get<Repository<Contract>>(getRepositoryToken(Contract));
    accountingRepository = module.get<Repository<AccountingRecord>>(
      getRepositoryToken(AccountingRecord),
    );
    alertsService = module.get<AlertsService>(AlertsService);
    dataSource = module.get<DataSource>(DataSource);
    queryRunner = mockQueryRunner as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create expense successfully', async () => {
      const user = createMockUser();
      const createDto: CreateExpenseDto = {
        work_id: 'work-id',
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount: 15000,
        currency: Currency.ARS,
        purchase_date: '2024-01-15',
        document_type: DocumentType.INVOICE_A,
        document_number: '0001-00001234',
      };

      mockWorkRepository.findOne.mockResolvedValue(mockWork);
      mockSupplierRepository.findOne.mockResolvedValue(mockSupplier);
      mockExpenseRepository.create.mockReturnValue({
        ...createDto,
        id: 'expense-id',
        created_by_id: user.id,
        state: ExpenseState.PENDING,
      });
      mockExpenseRepository.save.mockResolvedValue({
        id: 'expense-id',
        ...createDto,
        created_by_id: user.id,
        state: ExpenseState.PENDING,
      });
      mockExpenseRepository.createQueryBuilder().getRawOne.mockResolvedValue({ total: '0' });
      mockWorkRepository.save.mockResolvedValue(mockWork);

      const result = await service.create(createDto, user);

      expect(result).toBeDefined();
      expect(result.work_id).toBe(createDto.work_id);
      expect(mockWorkRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDto.work_id },
      });
      expect(mockExpenseRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when work does not exist', async () => {
      const user = createMockUser();
      const createDto: CreateExpenseDto = {
        work_id: 'non-existent-work',
        rubric_id: 'rubric-id',
        amount: 15000,
        currency: Currency.ARS,
        purchase_date: '2024-01-15',
        document_type: DocumentType.INVOICE_A,
      };

      mockWorkRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, user)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto, user)).rejects.toThrow('Work with ID');
    });

    it('should throw BadRequestException when supplier is blocked', async () => {
      const user = createMockUser();
      const createDto: CreateExpenseDto = {
        work_id: 'work-id',
        supplier_id: 'blocked-supplier-id',
        rubric_id: 'rubric-id',
        amount: 15000,
        currency: Currency.ARS,
        purchase_date: '2024-01-15',
        document_type: DocumentType.INVOICE_A,
      };

      const blockedSupplier = { ...mockSupplier, status: 'blocked' };

      mockWorkRepository.findOne.mockResolvedValue(mockWork);
      mockSupplierRepository.findOne.mockResolvedValue(blockedSupplier);

      await expect(service.create(createDto, user)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto, user)).rejects.toThrow('blocked supplier');
    });

    it('should auto-generate VAL when document type is VAL', async () => {
      const user = createMockUser();
      const createDto: CreateExpenseDto = {
        work_id: 'work-id',
        rubric_id: 'rubric-id',
        amount: 15000,
        currency: Currency.ARS,
        purchase_date: '2024-01-15',
        document_type: DocumentType.VAL,
      };

      mockWorkRepository.findOne.mockResolvedValue(mockWork);
      mockExpenseRepository.create.mockReturnValue({
        ...createDto,
        id: 'expense-id',
        created_by_id: user.id,
      });
      mockExpenseRepository.save.mockResolvedValue({
        id: 'expense-id',
        ...createDto,
        created_by_id: user.id,
      });
      mockValRepository.findOne.mockResolvedValue(null); // No existing VAL
      mockValRepository.createQueryBuilder().getOne.mockResolvedValue(null); // No last VAL
      mockValRepository.create.mockReturnValue({
        code: 'VAL-000001',
        expense_id: 'expense-id',
      });
      mockValRepository.save.mockResolvedValue({
        id: 'val-id',
        code: 'VAL-000001',
        expense_id: 'expense-id',
      });
      mockExpenseRepository.createQueryBuilder().getRawOne.mockResolvedValue({ total: '0' });
      mockWorkRepository.save.mockResolvedValue(mockWork);

      await service.create(createDto, user);

      expect(mockValRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VAL-000001',
          expense_id: 'expense-id',
        }),
      );
      expect(mockValRepository.save).toHaveBeenCalled();
    });

    it('should NOT auto-generate VAL when document type is not VAL', async () => {
      const user = createMockUser();
      const createDto: CreateExpenseDto = {
        work_id: 'work-id',
        rubric_id: 'rubric-id',
        amount: 15000,
        currency: Currency.ARS,
        purchase_date: '2024-01-15',
        document_type: DocumentType.INVOICE_A,
        document_number: '001-00001234',
      };

      mockWorkRepository.findOne.mockResolvedValue(mockWork);
      mockExpenseRepository.create.mockReturnValue({
        ...createDto,
        id: 'expense-id',
        created_by_id: user.id,
      });
      mockExpenseRepository.save.mockResolvedValue({
        id: 'expense-id',
        ...createDto,
        created_by_id: user.id,
      });
      mockExpenseRepository.createQueryBuilder().getRawOne.mockResolvedValue({ total: '0' });
      mockWorkRepository.save.mockResolvedValue(mockWork);

      await service.create(createDto, user);

      // VAL should NOT be generated
      expect(mockValRepository.create).not.toHaveBeenCalled();
      expect(mockValRepository.save).not.toHaveBeenCalled();
    });

    it('should NOT auto-generate VAL when document_number is provided but type is not VAL', async () => {
      const user = createMockUser();
      const createDto: CreateExpenseDto = {
        work_id: 'work-id',
        rubric_id: 'rubric-id',
        amount: 15000,
        currency: Currency.ARS,
        purchase_date: '2024-01-15',
        document_type: DocumentType.INVOICE_B,
        // No document_number provided
      };

      mockWorkRepository.findOne.mockResolvedValue(mockWork);
      mockExpenseRepository.create.mockReturnValue({
        ...createDto,
        id: 'expense-id',
        created_by_id: user.id,
      });
      mockExpenseRepository.save.mockResolvedValue({
        id: 'expense-id',
        ...createDto,
        created_by_id: user.id,
      });
      mockExpenseRepository.createQueryBuilder().getRawOne.mockResolvedValue({ total: '0' });
      mockWorkRepository.save.mockResolvedValue(mockWork);

      await service.create(createDto, user);

      // VAL should NOT be generated even if document_number is missing
      expect(mockValRepository.create).not.toHaveBeenCalled();
      expect(mockValRepository.save).not.toHaveBeenCalled();
    });

    it('should generate sequential VAL codes', async () => {
      const user = createMockUser();
      const createDto: CreateExpenseDto = {
        work_id: 'work-id',
        rubric_id: 'rubric-id',
        amount: 15000,
        currency: Currency.ARS,
        purchase_date: '2024-01-15',
        document_type: DocumentType.VAL,
      };

      // Mock existing VAL with code VAL-000005
      const existingVal = {
        id: 'val-existing-id',
        code: 'VAL-000005',
        expense_id: 'existing-expense-id',
      };

      mockWorkRepository.findOne.mockResolvedValue(mockWork);
      mockExpenseRepository.create.mockReturnValue({
        ...createDto,
        id: 'expense-id',
        created_by_id: user.id,
      });
      mockExpenseRepository.save.mockResolvedValue({
        id: 'expense-id',
        ...createDto,
        created_by_id: user.id,
      });
      mockValRepository.findOne.mockResolvedValue(null); // No existing VAL for this expense
      const valQueryBuilder = {
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(existingVal), // Last VAL is VAL-000005
      };
      mockValRepository.createQueryBuilder.mockReturnValue(valQueryBuilder);
      mockValRepository.create.mockReturnValue({
        code: 'VAL-000006', // Next sequential number
        expense_id: 'expense-id',
      });
      mockValRepository.save.mockResolvedValue({
        id: 'val-id',
        code: 'VAL-000006',
        expense_id: 'expense-id',
      });
      mockExpenseRepository.createQueryBuilder().getRawOne.mockResolvedValue({ total: '0' });
      mockWorkRepository.save.mockResolvedValue(mockWork);

      await service.create(createDto, user);

      expect(mockValRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VAL-000006', // Sequential: 5 + 1 = 6
          expense_id: 'expense-id',
        }),
      );
    });

    it('should generate VAL-000001 when no VALs exist', async () => {
      const user = createMockUser();
      const createDto: CreateExpenseDto = {
        work_id: 'work-id',
        rubric_id: 'rubric-id',
        amount: 15000,
        currency: Currency.ARS,
        purchase_date: '2024-01-15',
        document_type: DocumentType.VAL,
      };

      mockWorkRepository.findOne.mockResolvedValue(mockWork);
      mockExpenseRepository.create.mockReturnValue({
        ...createDto,
        id: 'expense-id',
        created_by_id: user.id,
      });
      mockExpenseRepository.save.mockResolvedValue({
        id: 'expense-id',
        ...createDto,
        created_by_id: user.id,
      });
      mockValRepository.findOne.mockResolvedValue(null);
      mockValRepository.createQueryBuilder().getOne.mockResolvedValue(null); // No VALs exist
      mockValRepository.create.mockReturnValue({
        code: 'VAL-000001',
        expense_id: 'expense-id',
      });
      mockValRepository.save.mockResolvedValue({
        id: 'val-id',
        code: 'VAL-000001',
        expense_id: 'expense-id',
      });
      mockExpenseRepository.createQueryBuilder().getRawOne.mockResolvedValue({ total: '0' });
      mockWorkRepository.save.mockResolvedValue(mockWork);

      await service.create(createDto, user);

      expect(mockValRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VAL-000001', // First VAL
          expense_id: 'expense-id',
        }),
      );
    });

    it('should return existing VAL if already exists for expense', async () => {
      const user = createMockUser();
      const createDto: CreateExpenseDto = {
        work_id: 'work-id',
        rubric_id: 'rubric-id',
        amount: 15000,
        currency: Currency.ARS,
        purchase_date: '2024-01-15',
        document_type: DocumentType.VAL,
      };

      const existingVal = {
        id: 'val-existing-id',
        code: 'VAL-000003',
        expense_id: 'expense-id',
      };

      mockWorkRepository.findOne.mockResolvedValue(mockWork);
      mockExpenseRepository.create.mockReturnValue({
        ...createDto,
        id: 'expense-id',
        created_by_id: user.id,
      });
      mockExpenseRepository.save.mockResolvedValue({
        id: 'expense-id',
        ...createDto,
        created_by_id: user.id,
      });
      mockValRepository.findOne.mockResolvedValue(existingVal); // VAL already exists
      mockExpenseRepository.createQueryBuilder().getRawOne.mockResolvedValue({ total: '0' });
      mockWorkRepository.save.mockResolvedValue(mockWork);

      await service.create(createDto, user);

      // Should not create new VAL, should use existing
      expect(mockValRepository.create).not.toHaveBeenCalled();
      expect(mockValRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should validate expense successfully', async () => {
      const user = createMockUser({ 
        role: { name: UserRole.ADMINISTRATION },
        organizationId: 'org-id',
      });
      const expense: Expense = {
        id: 'expense-id',
        work_id: 'work-id',
        work: { ...mockWork, organization_id: user.organizationId || null },
        rubric_id: 'rubric-id',
        amount: 15000,
        currency: Currency.ARS,
        purchase_date: new Date('2024-01-15'),
        document_type: DocumentType.INVOICE_A,
        state: ExpenseState.PENDING,
        created_by_id: 'user-id',
        created_at: new Date(),
        updated_at: new Date(),
      } as Expense;

      const validateDto: ValidateExpenseDto = {
        state: ExpenseState.VALIDATED,
        observations: 'All good',
      };

      const expenseWithState = {
        ...expense,
        state: ExpenseState.PENDING,
      };
      const savedExpense = {
        ...expenseWithState,
        state: ExpenseState.VALIDATED,
        validated_by_id: user.id,
        validated_at: new Date(),
      };
      mockExpenseRepository.findOne.mockResolvedValue(expenseWithState);
      mockQueryRunner.manager.save.mockResolvedValue(savedExpense);
      mockAccountingRepository.findOne.mockResolvedValue(null); // No existing accounting record
      mockAccountingRepository.create.mockReturnValue({});
      mockAccountingRepository.save.mockResolvedValue({});
      mockExpenseRepository.createQueryBuilder().getRawOne.mockResolvedValue({ total: '15000' });
      mockWorkRepository.findOne.mockResolvedValue(mockWork);
      mockWorkRepository.save.mockResolvedValue(mockWork);

      const result = await service.validate('expense-id', validateDto, user);

      expect(result.state).toBe(ExpenseState.VALIDATED);
      expect(result.validated_by_id).toBe(user.id);
      expect(mockAccountingRepository.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when non-admin tries to validate', async () => {
      const user = createMockUser({ role: { name: UserRole.OPERATOR } });
      const validateDto: ValidateExpenseDto = {
        state: ExpenseState.VALIDATED,
      };

      await expect(service.validate('expense-id', validateDto, user)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.validate('expense-id', validateDto, user)).rejects.toThrow(
        'Only Administration and Direction can validate expenses',
      );
    });

    it('should throw BadRequestException when trying to validate annulled expense', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const expense: Expense = {
        id: 'expense-id',
        state: ExpenseState.ANNULLED,
      } as Expense;

      const validateDto: ValidateExpenseDto = {
        state: ExpenseState.VALIDATED,
      };

      mockExpenseRepository.findOne.mockResolvedValue(expense);

      await expect(service.validate('expense-id', validateDto, user)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validate('expense-id', validateDto, user)).rejects.toThrow(
        'Cannot validate an annulled expense',
      );
    });

    it('should auto-assign contract and update amount_executed when contract exists', async () => {
      const user = createMockUser({ 
        role: { name: UserRole.ADMINISTRATION },
        organizationId: 'org-id',
      });
      const expense: Expense = {
        id: 'expense-id',
        work_id: 'work-id',
        work: { ...mockWork, organization_id: user.organizationId || null },
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount: 10000,
        currency: Currency.ARS,
        purchase_date: new Date('2024-01-15'),
        document_type: DocumentType.INVOICE_A,
        state: ExpenseState.PENDING,
        created_by_id: 'user-id',
        created_at: new Date(),
        updated_at: new Date(),
      } as Expense;

      const contract: Contract = {
        id: 'contract-id',
        work_id: 'work-id',
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount_total: 100000,
        amount_executed: 50000,
        currency: Currency.ARS,
        is_blocked: false,
        created_at: new Date(),
        updated_at: new Date(),
      } as Contract;

      const validateDto: ValidateExpenseDto = {
        state: ExpenseState.VALIDATED,
      };

      const expenseWithState = { ...expense, state: ExpenseState.PENDING };
      const savedExpense = { ...expenseWithState, contract_id: 'contract-id', state: ExpenseState.VALIDATED };
      mockExpenseRepository.findOne.mockResolvedValue(expenseWithState);
      mockQueryRunner.manager.findOne.mockResolvedValue(contract);
      mockQueryRunner.manager.save.mockResolvedValue(savedExpense); // Save expense
      mockContractsService.updateAmountExecuted.mockResolvedValue({ ...contract, amount_executed: 60000 });
      mockAccountingRepository.findOne.mockResolvedValue(null); // No existing accounting record
      mockAccountingRepository.create.mockReturnValue({});
      mockAccountingRepository.save.mockResolvedValue({});
      mockExpenseRepository.createQueryBuilder().getRawOne.mockResolvedValue({ total: '60000' });
      mockWorkRepository.findOne.mockResolvedValue(mockWork);
      mockWorkRepository.save.mockResolvedValue(mockWork);

      const result = await service.validate('expense-id', validateDto, user);

      expect(result.contract_id).toBe('contract-id');
      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(
        Contract,
        expect.objectContaining({
          where: {
            supplier_id: 'supplier-id',
            work_id: 'work-id',
            is_blocked: false,
          },
        }),
      );
      // Verify contract amount_executed was updated using the centralized method
      expect(mockContractsService.updateAmountExecuted).toHaveBeenCalledWith(
        contract.id,
        60000, // 50000 + 10000
        mockQueryRunner,
      );
    });

    it('should throw BadRequestException when contract has insufficient balance', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const expense: Expense = {
        id: 'expense-id',
        work_id: 'work-id',
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount: 60000, // More than available balance
        currency: Currency.ARS,
        purchase_date: new Date('2024-01-15'),
        document_type: DocumentType.INVOICE_A,
        state: ExpenseState.PENDING,
        created_by_id: 'user-id',
        created_at: new Date(),
        updated_at: new Date(),
      } as Expense;

      const contract: Contract = {
        id: 'contract-id',
        work_id: 'work-id',
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount_total: 100000,
        amount_executed: 50000, // Available: 50000, but expense is 60000
        currency: Currency.ARS,
        is_blocked: false,
        created_at: new Date(),
        updated_at: new Date(),
      } as Contract;

      const validateDto: ValidateExpenseDto = {
        state: ExpenseState.VALIDATED,
      };

      mockExpenseRepository.findOne.mockResolvedValue(expense);
      mockQueryRunner.manager.findOne.mockResolvedValue(contract);

      await expect(service.validate('expense-id', validateDto, user)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validate('expense-id', validateDto, user)).rejects.toThrow(
        'Contract has insufficient balance',
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockAlertsService.createAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.anything(), // CONTRACT_INSUFFICIENT_BALANCE
          severity: expect.anything(), // CRITICAL
          contract_id: 'contract-id',
          expense_id: 'expense-id',
        }),
      );
    });

    it('should not assign contract if no contract exists for supplier in work', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const expense: Expense = {
        id: 'expense-id',
        work_id: 'work-id',
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount: 10000,
        currency: Currency.ARS,
        purchase_date: new Date('2024-01-15'),
        document_type: DocumentType.INVOICE_A,
        state: ExpenseState.PENDING,
        created_by_id: 'user-id',
        created_at: new Date(),
        updated_at: new Date(),
      } as Expense;

      const validateDto: ValidateExpenseDto = {
        state: ExpenseState.VALIDATED,
      };

      mockExpenseRepository.findOne
        .mockResolvedValueOnce(expense) // findOne in validate
        .mockResolvedValueOnce({ ...expense }); // findOne at end
      mockQueryRunner.manager.findOne.mockResolvedValue(null); // No contract found
      mockQueryRunner.manager.save.mockResolvedValueOnce({ ...expense }); // Save expense
      mockAccountingRepository.create.mockReturnValue({});
      mockAccountingRepository.save.mockResolvedValue({});
      mockExpenseRepository.createQueryBuilder().getRawOne.mockResolvedValue({ total: '10000' });
      mockWorkRepository.findOne.mockResolvedValue(mockWork);
      mockWorkRepository.save.mockResolvedValue(mockWork);

      const result = await service.validate('expense-id', validateDto, user);

      expect(result.contract_id).toBeUndefined();
      expect(mockQueryRunner.manager.findOne).toHaveBeenCalled();
    });

    it('should revert contract balance when validated expense is observed', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const expense: Expense = {
        id: 'expense-id',
        work_id: 'work-id',
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount: 10000,
        currency: Currency.ARS,
        purchase_date: new Date('2024-01-15'),
        document_type: DocumentType.INVOICE_A,
        state: ExpenseState.VALIDATED, // Previously validated
        contract_id: 'contract-id', // Has contract
        created_by_id: 'user-id',
        created_at: new Date(),
        updated_at: new Date(),
      } as Expense;

      const contract: Contract = {
        id: 'contract-id',
        work_id: 'work-id',
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount_total: 100000,
        amount_executed: 60000, // Was 50000, then +10000 from this expense
        currency: Currency.ARS,
        is_blocked: false,
        created_at: new Date(),
        updated_at: new Date(),
      } as Contract;

      const validateDto: ValidateExpenseDto = {
        state: ExpenseState.OBSERVED, // Now being observed (rejected)
        observations: 'Needs correction',
      };

      mockExpenseRepository.findOne
        .mockResolvedValueOnce(expense) // findOne in validate
        .mockResolvedValueOnce({ ...expense, state: ExpenseState.OBSERVED }); // findOne at end
      mockQueryRunner.manager.findOne.mockResolvedValue(contract);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...contract, amount_executed: 50000 }) // Contract reverted
        .mockResolvedValueOnce({ ...expense, state: ExpenseState.OBSERVED }); // Expense saved
      mockWorkRepository.findOne.mockResolvedValue(mockWork);
      mockWorkRepository.save.mockResolvedValue(mockWork);

      const result = await service.validate('expense-id', validateDto, user);

      expect(result.state).toBe(ExpenseState.OBSERVED);
      // Verify contract balance was reverted
      const contractSaveCall = mockQueryRunner.manager.save.mock.calls.find(
        (call) => call[0] === Contract,
      );
      expect(contractSaveCall).toBeDefined();
      const updatedContract = contractSaveCall[1];
      expect(updatedContract.amount_executed).toBe(50000); // Reverted from 60000 to 50000
      expect(mockAlertsService.createAlert).toHaveBeenCalled();
    });

    it('should revert contract balance when validated expense is annulled', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const expense: Expense = {
        id: 'expense-id',
        work_id: 'work-id',
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount: 15000,
        currency: Currency.ARS,
        purchase_date: new Date('2024-01-15'),
        document_type: DocumentType.INVOICE_A,
        state: ExpenseState.VALIDATED, // Previously validated
        contract_id: 'contract-id', // Has contract
        created_by_id: 'user-id',
        created_at: new Date(),
        updated_at: new Date(),
      } as Expense;

      const contract: Contract = {
        id: 'contract-id',
        work_id: 'work-id',
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount_total: 100000,
        amount_executed: 65000, // Was 50000, then +15000 from this expense
        currency: Currency.ARS,
        is_blocked: false,
        created_at: new Date(),
        updated_at: new Date(),
      } as Contract;

      const validateDto: ValidateExpenseDto = {
        state: ExpenseState.ANNULLED, // Now being annulled (rejected)
      };

      mockExpenseRepository.findOne
        .mockResolvedValueOnce(expense) // findOne in validate
        .mockResolvedValueOnce({ ...expense, state: ExpenseState.ANNULLED }); // findOne at end
      mockQueryRunner.manager.findOne.mockResolvedValue(contract);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...contract, amount_executed: 50000 }) // Contract reverted
        .mockResolvedValueOnce({ ...expense, state: ExpenseState.ANNULLED }); // Expense saved

      const result = await service.validate('expense-id', validateDto, user);

      expect(result.state).toBe(ExpenseState.ANNULLED);
      // Verify contract balance was reverted
      const contractSaveCall = mockQueryRunner.manager.save.mock.calls.find(
        (call) => call[0] === Contract,
      );
      expect(contractSaveCall).toBeDefined();
      const updatedContract = contractSaveCall[1];
      expect(updatedContract.amount_executed).toBe(50000); // Reverted from 65000 to 50000
    });

    it('should not revert contract balance when pending expense is observed', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const expense: Expense = {
        id: 'expense-id',
        work_id: 'work-id',
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount: 10000,
        currency: Currency.ARS,
        purchase_date: new Date('2024-01-15'),
        document_type: DocumentType.INVOICE_A,
        state: ExpenseState.PENDING, // Not validated yet
        contract_id: 'contract-id',
        created_by_id: 'user-id',
        created_at: new Date(),
        updated_at: new Date(),
      } as Expense;

      const validateDto: ValidateExpenseDto = {
        state: ExpenseState.OBSERVED,
        observations: 'Needs correction',
      };

      mockExpenseRepository.findOne
        .mockResolvedValueOnce(expense) // findOne in validate
        .mockResolvedValueOnce({ ...expense, state: ExpenseState.OBSERVED }); // findOne at end
      mockQueryRunner.manager.save.mockResolvedValueOnce({ ...expense, state: ExpenseState.OBSERVED });
      mockWorkRepository.findOne.mockResolvedValue(mockWork);
      mockWorkRepository.save.mockResolvedValue(mockWork);

      const result = await service.validate('expense-id', validateDto, user);

      expect(result.state).toBe(ExpenseState.OBSERVED);
      // Verify contract was NOT updated (no contract save call)
      const contractSaveCalls = mockQueryRunner.manager.save.mock.calls.filter(
        (call) => call[0] === Contract,
      );
      expect(contractSaveCalls.length).toBe(0); // No contract save calls
      expect(mockAlertsService.createAlert).toHaveBeenCalled();
    });

    it('should not revert contract balance when expense has no contract_id', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const expense: Expense = {
        id: 'expense-id',
        work_id: 'work-id',
        work: { ...mockWork, organization_id: user.organizationId || null },
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount: 10000,
        currency: Currency.ARS,
        purchase_date: new Date('2024-01-15'),
        document_type: DocumentType.INVOICE_A,
        state: ExpenseState.VALIDATED, // Previously validated
        contract_id: null, // No contract
        created_by_id: 'user-id',
        created_at: new Date(),
        updated_at: new Date(),
      } as Expense;

      const validateDto: ValidateExpenseDto = {
        state: ExpenseState.OBSERVED,
        observations: 'Needs correction',
      };

      const expenseWithState = { ...expense, state: ExpenseState.VALIDATED, contract_id: null };
      const savedExpense = { ...expenseWithState, state: ExpenseState.OBSERVED };
      mockExpenseRepository.findOne.mockResolvedValue(expenseWithState);
      // No contract findOne calls should happen since contract_id is null and state is not VALIDATED
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save.mockResolvedValueOnce(savedExpense);
      mockWorkRepository.findOne.mockResolvedValue(mockWork);
      mockWorkRepository.save.mockResolvedValue(mockWork);

      const result = await service.validate('expense-id', validateDto, user);

      expect(result.state).toBe(ExpenseState.OBSERVED);
      // Verify contract was searched (because supplier_id and work_id exist), but not saved since state is OBSERVED
      const contractFindCalls = mockQueryRunner.manager.findOne.mock.calls.filter(
        (call) => call[0] === Contract,
      );
      // Contract is searched but not saved when state is OBSERVED
      expect(contractFindCalls.length).toBeGreaterThan(0); // Contract is searched
      const contractSaveCalls = mockQueryRunner.manager.save.mock.calls.filter(
        (call) => call[0] === Contract,
      );
      expect(contractSaveCalls.length).toBe(0); // But not saved
      expect(mockAlertsService.createAlert).toHaveBeenCalled();
    });

    it('should create accounting record automatically when expense is validated', async () => {
      const user = createMockUser({ 
        role: { name: UserRole.ADMINISTRATION },
        organizationId: 'org-id',
      });
      const expense: Expense = {
        id: 'expense-id',
        work_id: 'work-id',
        work: { ...mockWork, organization_id: 'org-id' },
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount: 15000,
        currency: Currency.ARS,
        purchase_date: new Date('2024-01-15'),
        document_type: DocumentType.INVOICE_A,
        document_number: 'FAC-001',
        state: ExpenseState.PENDING,
        vat_amount: 3150,
        vat_rate: 21,
        vat_perception: 500,
        vat_withholding: 0,
        iibb_perception: 300,
        income_tax_withholding: 0,
        file_url: 'https://example.com/file.pdf',
        observations: 'Test expense',
        created_by_id: 'user-id',
        created_at: new Date(),
        updated_at: new Date(),
      } as Expense;

      const validateDto: ValidateExpenseDto = {
        state: ExpenseState.VALIDATED,
      };

      const expenseWithState = { ...expense, state: ExpenseState.PENDING };
      const savedExpense = { ...expenseWithState, state: ExpenseState.VALIDATED };
      mockExpenseRepository.findOne.mockResolvedValue(expenseWithState);
      mockQueryRunner.manager.findOne.mockResolvedValue(null); // No contract
      mockQueryRunner.manager.save.mockResolvedValue(savedExpense); // Save expense with VALIDATED state
      mockAccountingRepository.findOne.mockResolvedValue(null); // No existing accounting record
      mockAccountingRepository.create.mockReturnValue({
        id: 'accounting-record-id',
        expense_id: expense.id,
        organization_id: 'org-id',
      });
      mockAccountingRepository.save.mockResolvedValue({
        id: 'accounting-record-id',
        expense_id: expense.id,
        work_id: expense.work_id,
        supplier_id: expense.supplier_id,
        organization_id: 'org-id',
        accounting_type: 'fiscal',
        date: expense.purchase_date,
        month: 1,
        year: 2024,
        document_number: expense.document_number,
        description: expense.observations,
        amount: expense.amount,
        currency: expense.currency,
        vat_amount: expense.vat_amount,
        vat_rate: expense.vat_rate,
        vat_perception: expense.vat_perception,
        vat_withholding: expense.vat_withholding,
        iibb_perception: expense.iibb_perception,
        income_tax_withholding: expense.income_tax_withholding,
        file_url: expense.file_url,
      });
      mockExpenseRepository.createQueryBuilder().getRawOne.mockResolvedValue({ total: '15000' });
      mockWorkRepository.findOne.mockResolvedValue(mockWork);
      mockWorkRepository.save.mockResolvedValue(mockWork);

      await service.validate('expense-id', validateDto, user);

      // Verify accounting record was created with correct data
      expect(mockAccountingRepository.findOne).toHaveBeenCalledWith({
        where: { expense_id: expense.id },
      });
      expect(mockAccountingRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expense_id: expense.id,
          work_id: expense.work_id,
          supplier_id: expense.supplier_id,
          organization_id: 'org-id',
          accounting_type: 'fiscal',
          date: expense.purchase_date,
          month: 1,
          year: 2024,
          document_number: expense.document_number,
          description: expense.observations,
          amount: expense.amount,
          currency: expense.currency,
          vat_amount: expense.vat_amount,
          vat_rate: expense.vat_rate,
          vat_perception: expense.vat_perception,
          vat_withholding: expense.vat_withholding || null, // Service converts 0 to null
          iibb_perception: expense.iibb_perception,
          income_tax_withholding: expense.income_tax_withholding || null, // Service converts 0 to null
          file_url: expense.file_url,
        }),
      );
      expect(mockAccountingRepository.save).toHaveBeenCalled();
    });

    it('should not create duplicate accounting record if one already exists', async () => {
      const user = createMockUser({ 
        role: { name: UserRole.ADMINISTRATION },
        organizationId: 'org-id',
      });
      const expense: Expense = {
        id: 'expense-id',
        work_id: 'work-id',
        work: { ...mockWork, organization_id: 'org-id' },
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount: 15000,
        currency: Currency.ARS,
        purchase_date: new Date('2024-01-15'),
        document_type: DocumentType.INVOICE_A,
        state: ExpenseState.PENDING,
        created_by_id: 'user-id',
        created_at: new Date(),
        updated_at: new Date(),
      } as Expense;

      const existingAccountingRecord = {
        id: 'existing-record-id',
        expense_id: expense.id,
      };

      const validateDto: ValidateExpenseDto = {
        state: ExpenseState.VALIDATED,
      };

      const expenseWithState = { ...expense, state: ExpenseState.PENDING };
      const savedExpense = { ...expenseWithState, state: ExpenseState.VALIDATED };
      mockExpenseRepository.findOne.mockResolvedValue(expenseWithState);
      mockQueryRunner.manager.findOne.mockResolvedValue(null); // No contract
      mockQueryRunner.manager.save.mockResolvedValue(savedExpense); // Save expense with VALIDATED state
      mockAccountingRepository.findOne.mockResolvedValue(existingAccountingRecord); // Existing record
      mockExpenseRepository.createQueryBuilder().getRawOne.mockResolvedValue({ total: '15000' });
      mockWorkRepository.findOne.mockResolvedValue(mockWork);
      mockWorkRepository.save.mockResolvedValue(mockWork);

      await service.validate('expense-id', validateDto, user);

      // Verify accounting record was checked but not created again
      expect(mockAccountingRepository.findOne).toHaveBeenCalledWith({
        where: { expense_id: expense.id },
      });
      expect(mockAccountingRepository.create).not.toHaveBeenCalled();
      expect(mockAccountingRepository.save).not.toHaveBeenCalled();
    });

    it('should create accounting record with CASH type for VAL documents', async () => {
      const user = createMockUser({ 
        role: { name: UserRole.ADMINISTRATION },
        organizationId: 'org-id',
      });
      const expense: Expense = {
        id: 'expense-id',
        work_id: 'work-id',
        work: { ...mockWork, organization_id: 'org-id' },
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount: 10000,
        currency: Currency.ARS,
        purchase_date: new Date('2024-01-15'),
        document_type: DocumentType.VAL,
        state: ExpenseState.PENDING,
        created_by_id: 'user-id',
        created_at: new Date(),
        updated_at: new Date(),
      } as Expense;

      const validateDto: ValidateExpenseDto = {
        state: ExpenseState.VALIDATED,
      };

      const expenseWithState = { ...expense, state: ExpenseState.PENDING };
      const savedExpense = { ...expenseWithState, state: ExpenseState.VALIDATED };
      mockExpenseRepository.findOne.mockResolvedValue(expenseWithState);
      mockQueryRunner.manager.findOne.mockResolvedValue(null); // No contract
      mockQueryRunner.manager.save.mockResolvedValue(savedExpense); // Save expense with VALIDATED state
      mockAccountingRepository.findOne.mockResolvedValue(null); // No existing record
      mockAccountingRepository.create.mockReturnValue({});
      mockAccountingRepository.save.mockResolvedValue({});
      mockExpenseRepository.createQueryBuilder().getRawOne.mockResolvedValue({ total: '10000' });
      mockWorkRepository.findOne.mockResolvedValue(mockWork);
      mockWorkRepository.save.mockResolvedValue(mockWork);

      await service.validate('expense-id', validateDto, user);

      // Verify accounting record was created with CASH type
      expect(mockAccountingRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accounting_type: 'cash',
        }),
      );
    });

    it('should not create accounting record when expense is not validated', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const expense: Expense = {
        id: 'expense-id',
        work_id: 'work-id',
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount: 15000,
        currency: Currency.ARS,
        purchase_date: new Date('2024-01-15'),
        document_type: DocumentType.INVOICE_A,
        state: ExpenseState.PENDING,
        created_by_id: 'user-id',
        created_at: new Date(),
        updated_at: new Date(),
      } as Expense;

      const validateDto: ValidateExpenseDto = {
        state: ExpenseState.OBSERVED, // Not validated
      };

      mockExpenseRepository.findOne
        .mockResolvedValueOnce(expense) // findOne in validate
        .mockResolvedValueOnce({ ...expense, state: ExpenseState.OBSERVED }); // findOne at end
      mockQueryRunner.manager.save.mockResolvedValueOnce({ ...expense, state: ExpenseState.OBSERVED });
      mockWorkRepository.findOne.mockResolvedValue(mockWork);
      mockWorkRepository.save.mockResolvedValue(mockWork);

      await service.validate('expense-id', validateDto, user);

      // Verify accounting record was NOT created
      expect(mockAccountingRepository.findOne).not.toHaveBeenCalled();
      expect(mockAccountingRepository.create).not.toHaveBeenCalled();
      expect(mockAccountingRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all expenses for non-operator users', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const expenses = [
        {
          id: 'expense-1',
          work_id: 'work-id',
          amount: 15000,
        },
      ];

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
        getMany: jest.fn().mockResolvedValue(expenses),
      };
      mockExpenseRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll(user);

      expect(result).toEqual(expenses);
    });

    it('should return only user expenses for operators', async () => {
      const user = createMockUser({ role: { name: UserRole.OPERATOR } });
      const expenses = [
        {
          id: 'expense-1',
          work_id: 'work-id',
          amount: 15000,
          created_by_id: user.id,
        },
      ];

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
        getMany: jest.fn().mockResolvedValue(expenses),
      };
      mockExpenseRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll(user);

      expect(result).toEqual(expenses);
      expect(queryBuilder.where).toHaveBeenCalledWith('expense.created_by_id = :userId', {
        userId: user.id,
      });
    });
  });

  describe('findOne', () => {
    it('should return expense when found', async () => {
      const user = createMockUser();
      const expense: Expense = {
        id: 'expense-id',
        created_by_id: user.id,
        work: { ...mockWork, organization_id: null }, // No organization restriction
      } as Expense;

      mockExpenseRepository.findOne.mockResolvedValue(expense);

      const result = await service.findOne('expense-id', user);

      expect(result.id).toBe(expense.id);
      expect(result.created_by_id).toBe(expense.created_by_id);
    });

    it('should throw NotFoundException when expense not found', async () => {
      const user = createMockUser();
      // Clear any previous mocks
      mockExpenseRepository.findOne.mockClear();
      mockExpenseRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent', user)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when operator tries to access other user expense', async () => {
      const user = createMockUser({ role: { name: UserRole.OPERATOR } });
      const expense: Expense = {
        id: 'expense-id',
        created_by_id: 'other-user-id',
        work: { ...mockWork, organization_id: null }, // No organization restriction
      } as Expense;

      mockExpenseRepository.findOne.mockResolvedValue(expense);

      await expect(service.findOne('expense-id', user)).rejects.toThrow(ForbiddenException);
    });
  });
});

