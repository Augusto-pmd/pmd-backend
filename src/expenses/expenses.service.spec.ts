import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { Expense } from './expenses.entity';
import { Val } from '../val/val.entity';
import { Work } from '../works/works.entity';
import { Supplier } from '../suppliers/suppliers.entity';
import { AccountingRecord } from '../accounting/accounting.entity';
import { AlertsService } from '../alerts/alerts.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ValidateExpenseDto } from './dto/validate-expense.dto';
import { User } from '../users/user.entity';
import { Currency, ExpenseState, DocumentType, UserRole, WorkStatus } from '../common/enums';
import { createMockUser } from '../common/test/test-helpers';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let expenseRepository: Repository<Expense>;
  let valRepository: Repository<Val>;
  let workRepository: Repository<Work>;
  let supplierRepository: Repository<Supplier>;
  let accountingRepository: Repository<AccountingRecord>;
  let alertsService: AlertsService;

  const mockExpenseRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
    })),
  };

  const mockValRepository = {
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
  };

  const mockAccountingRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockAlertsService = {
    createAlert: jest.fn(),
  };

  const mockDataSource = {
    // Add any DataSource methods if needed
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
    supervisor_id: null,
    supervisor: null,
    total_budget: 100000,
    total_expenses: 0,
    total_incomes: 0,
    physical_progress: 0,
    economic_progress: 0,
    financial_progress: 0,
    created_at: new Date(),
    updated_at: new Date(),
    budgets: [],
    contracts: [],
    expenses: [],
    incomes: [],
    schedules: [],
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
          provide: getRepositoryToken(AccountingRecord),
          useValue: mockAccountingRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: AlertsService,
          useValue: mockAlertsService,
        },
      ],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);
    expenseRepository = module.get<Repository<Expense>>(getRepositoryToken(Expense));
    valRepository = module.get<Repository<Val>>(getRepositoryToken(Val));
    workRepository = module.get<Repository<Work>>(getRepositoryToken(Work));
    supplierRepository = module.get<Repository<Supplier>>(getRepositoryToken(Supplier));
    accountingRepository = module.get<Repository<AccountingRecord>>(
      getRepositoryToken(AccountingRecord),
    );
    alertsService = module.get<AlertsService>(AlertsService);
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
      mockValRepository.createQueryBuilder().getOne.mockResolvedValue(null);
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

      expect(mockValRepository.create).toHaveBeenCalled();
      expect(mockValRepository.save).toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should validate expense successfully', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const expense: Expense = {
        id: 'expense-id',
        work_id: 'work-id',
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

      mockExpenseRepository.findOne.mockResolvedValue(expense);
      mockExpenseRepository.save.mockResolvedValue({
        ...expense,
        state: ExpenseState.VALIDATED,
        validated_by_id: user.id,
        validated_at: new Date(),
      });
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

      mockExpenseRepository.createQueryBuilder().getMany.mockResolvedValue(expenses);

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

      const queryBuilder = mockExpenseRepository.createQueryBuilder();
      queryBuilder.getMany.mockResolvedValue(expenses);

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
      } as Expense;

      mockExpenseRepository.findOne.mockResolvedValue(expense);

      const result = await service.findOne('expense-id', user);

      expect(result).toEqual(expense);
    });

    it('should throw NotFoundException when expense not found', async () => {
      const user = createMockUser();
      mockExpenseRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent', user)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when operator tries to access other user expense', async () => {
      const user = createMockUser({ role: { name: UserRole.OPERATOR } });
      const expense: Expense = {
        id: 'expense-id',
        created_by_id: 'other-user-id',
      } as Expense;

      mockExpenseRepository.findOne.mockResolvedValue(expense);

      await expect(service.findOne('expense-id', user)).rejects.toThrow(ForbiddenException);
    });
  });
});

