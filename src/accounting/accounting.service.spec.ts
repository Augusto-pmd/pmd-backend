import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { AccountingRecord } from './accounting.entity';
import { Expense } from '../expenses/expenses.entity';
import { Cashbox } from '../cashboxes/cashboxes.entity';
import { Contract } from '../contracts/contracts.entity';
import { CreateAccountingRecordDto } from './dto/create-accounting-record.dto';
import { CloseMonthDto } from './dto/close-month.dto';
import { AccountingType, Currency, MonthStatus, UserRole, ExpenseState, CashboxStatus } from '../common/enums';
import { createMockUser } from '../common/test/test-helpers';

describe('AccountingService', () => {
  let service: AccountingService;
  let accountingRepository: Repository<AccountingRecord>;
  let expenseRepository: Repository<Expense>;
  let cashboxRepository: Repository<Cashbox>;
  let contractRepository: Repository<Contract>;

  const mockAccountingRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  };

  const mockExpenseRepository = {
    find: jest.fn(),
  };

  const mockCashboxRepository = {
    find: jest.fn(),
  };

  const mockContractRepository = {
    find: jest.fn(),
  };

  const mockRecord: AccountingRecord = {
    id: 'record-id',
    accounting_type: AccountingType.FISCAL,
    date: new Date('2024-01-15'),
    month: 1,
    year: 2024,
    month_status: MonthStatus.OPEN,
    amount: 15000,
    currency: Currency.ARS,
    created_at: new Date(),
    updated_at: new Date(),
  } as AccountingRecord;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingService,
        {
          provide: getRepositoryToken(AccountingRecord),
          useValue: mockAccountingRepository,
        },
        {
          provide: getRepositoryToken(Expense),
          useValue: mockExpenseRepository,
        },
        {
          provide: getRepositoryToken(Cashbox),
          useValue: mockCashboxRepository,
        },
        {
          provide: getRepositoryToken(Contract),
          useValue: mockContractRepository,
        },
      ],
    }).compile();

    service = module.get<AccountingService>(AccountingService);
    accountingRepository = module.get<Repository<AccountingRecord>>(
      getRepositoryToken(AccountingRecord),
    );
    expenseRepository = module.get<Repository<Expense>>(
      getRepositoryToken(Expense),
    );
    cashboxRepository = module.get<Repository<Cashbox>>(
      getRepositoryToken(Cashbox),
    );
    contractRepository = module.get<Repository<Contract>>(
      getRepositoryToken(Contract),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockExpenseRepository.find.mockClear();
    mockCashboxRepository.find.mockClear();
    mockContractRepository.find.mockClear();
  });

  describe('create', () => {
    it('should create accounting record successfully', async () => {
      const user = createMockUser();
      const createDto: CreateAccountingRecordDto = {
        accounting_type: AccountingType.FISCAL,
        date: '2024-01-15',
        month: 1,
        year: 2024,
        amount: 15000,
        currency: Currency.ARS,
      };

      mockAccountingRepository.findOne.mockResolvedValue(null);
      mockAccountingRepository.create.mockReturnValue({
        ...createDto,
        id: 'record-id',
        month_status: MonthStatus.OPEN,
      });
      mockAccountingRepository.save.mockResolvedValue({
        id: 'record-id',
        ...createDto,
        month_status: MonthStatus.OPEN,
      });

      const result = await service.create(createDto, user);

      expect(result).toBeDefined();
      expect(result.month_status).toBe(MonthStatus.OPEN);
    });

    it('should throw ForbiddenException when trying to create in closed month (non-direction)', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const createDto: CreateAccountingRecordDto = {
        accounting_type: AccountingType.FISCAL,
        date: '2024-01-15',
        month: 1,
        year: 2024,
        amount: 15000,
        currency: Currency.ARS,
      };

      const closedRecord = {
        ...mockRecord,
        month_status: MonthStatus.CLOSED,
      };

      mockAccountingRepository.findOne.mockResolvedValue(closedRecord);

      await expect(service.create(createDto, user)).rejects.toThrow(ForbiddenException);
      await expect(service.create(createDto, user)).rejects.toThrow('closed month');
    });

    it('should allow Direction to create in closed month', async () => {
      const user = createMockUser({ role: { name: UserRole.DIRECTION } });
      const createDto: CreateAccountingRecordDto = {
        accounting_type: AccountingType.FISCAL,
        date: '2024-01-15',
        month: 1,
        year: 2024,
        amount: 15000,
        currency: Currency.ARS,
      };

      const closedRecord = {
        ...mockRecord,
        month_status: MonthStatus.CLOSED,
      };

      mockAccountingRepository.findOne.mockResolvedValue(closedRecord);
      mockAccountingRepository.create.mockReturnValue({
        ...createDto,
        id: 'record-id',
      });
      mockAccountingRepository.save.mockResolvedValue({
        id: 'record-id',
        ...createDto,
      });

      const result = await service.create(createDto, user);

      expect(result).toBeDefined();
    });
  });

  describe('closeMonth', () => {
    it('should close month successfully when all validations pass', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const closeDto: CloseMonthDto = {
        month: 1,
        year: 2024,
        status: MonthStatus.CLOSED,
      };

      const records = [mockRecord];

      mockAccountingRepository.find.mockResolvedValue(records);
      mockAccountingRepository.findOne.mockResolvedValue(mockRecord); // For getMonthStatus
      mockExpenseRepository.find.mockResolvedValue([]); // No pending expenses
      mockCashboxRepository.find.mockResolvedValue([]); // No unapproved differences
      mockContractRepository.find.mockResolvedValue([]); // No problematic contracts
      mockAccountingRepository.update.mockResolvedValue({ affected: 1 });

      await service.closeMonth(closeDto, user);

      expect(mockAccountingRepository.update).toHaveBeenCalledWith(
        {
          month: closeDto.month,
          year: closeDto.year,
        },
        {
          month_status: MonthStatus.CLOSED,
        },
      );
    });

    it('should throw ForbiddenException when non-admin tries to close month', async () => {
      const user = createMockUser({ role: { name: UserRole.OPERATOR } });
      const closeDto: CloseMonthDto = {
        month: 1,
        year: 2024,
        status: MonthStatus.CLOSED,
      };

      await expect(service.closeMonth(closeDto, user)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when no records found', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const closeDto: CloseMonthDto = {
        month: 1,
        year: 2024,
        status: MonthStatus.CLOSED,
      };

      mockAccountingRepository.find.mockResolvedValue([]);

      await expect(service.closeMonth(closeDto, user)).rejects.toThrow(BadRequestException);
      await expect(service.closeMonth(closeDto, user)).rejects.toThrow(
        'No accounting records found',
      );
    });

    it('should throw BadRequestException when month is already closed', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const closeDto: CloseMonthDto = {
        month: 1,
        year: 2024,
        status: MonthStatus.CLOSED,
      };

      const closedRecord = {
        ...mockRecord,
        month_status: MonthStatus.CLOSED,
      };

      mockAccountingRepository.find.mockResolvedValue([closedRecord]);
      mockAccountingRepository.findOne.mockResolvedValue(closedRecord); // getMonthStatus returns CLOSED

      await expect(service.closeMonth(closeDto, user)).rejects.toThrow(BadRequestException);
      await expect(service.closeMonth(closeDto, user)).rejects.toThrow('already closed');
    });

    it('should throw BadRequestException when there are pending expenses', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const closeDto: CloseMonthDto = {
        month: 1,
        year: 2024,
        status: MonthStatus.CLOSED,
      };

      const pendingExpense: Expense = {
        id: 'expense-id',
        purchase_date: new Date('2024-01-15'),
        state: ExpenseState.PENDING,
      } as Expense;

      mockAccountingRepository.find.mockResolvedValue([mockRecord]);
      mockAccountingRepository.findOne.mockResolvedValue(mockRecord); // getMonthStatus returns OPEN
      mockExpenseRepository.find.mockResolvedValue([pendingExpense]); // Has pending expenses

      await expect(service.closeMonth(closeDto, user)).rejects.toThrow(BadRequestException);
      await expect(service.closeMonth(closeDto, user)).rejects.toThrow('pending expenses');
    });

    it('should throw BadRequestException when there are unapproved cashbox differences', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const closeDto: CloseMonthDto = {
        month: 1,
        year: 2024,
        status: MonthStatus.CLOSED,
      };

      const cashboxWithDifference: Cashbox = {
        id: 'cashbox-id',
        status: CashboxStatus.CLOSED,
        difference_approved: false,
        difference_ars: 1000,
        difference_usd: 0,
        closing_date: new Date('2024-01-20'),
      } as Cashbox;

      mockAccountingRepository.find.mockResolvedValue([mockRecord]);
      mockAccountingRepository.findOne.mockResolvedValue(mockRecord); // getMonthStatus returns OPEN
      mockExpenseRepository.find.mockResolvedValue([]); // No pending expenses
      mockCashboxRepository.find.mockResolvedValue([cashboxWithDifference]); // Has unapproved differences

      await expect(service.closeMonth(closeDto, user)).rejects.toThrow(BadRequestException);
      await expect(service.closeMonth(closeDto, user)).rejects.toThrow('unapproved differences');
    });

    it('should allow closing when cashbox differences are zero even if not approved', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const closeDto: CloseMonthDto = {
        month: 1,
        year: 2024,
        status: MonthStatus.CLOSED,
      };

      const cashboxWithZeroDifference: Cashbox = {
        id: 'cashbox-id',
        status: CashboxStatus.CLOSED,
        difference_approved: false,
        difference_ars: 0,
        difference_usd: 0,
        closing_date: new Date('2024-01-20'),
      } as Cashbox;

      mockAccountingRepository.find.mockResolvedValue([mockRecord]);
      mockAccountingRepository.findOne.mockResolvedValue(mockRecord); // getMonthStatus returns OPEN
      mockExpenseRepository.find.mockResolvedValue([]); // No pending expenses
      mockCashboxRepository.find.mockResolvedValue([cashboxWithZeroDifference]); // Zero differences
      mockContractRepository.find.mockResolvedValue([]); // No problematic contracts
      mockAccountingRepository.update.mockResolvedValue({ affected: 1 });

      await service.closeMonth(closeDto, user);

      expect(mockAccountingRepository.update).toHaveBeenCalled();
    });
  });

  describe('reopenMonth', () => {
    it('should reopen month successfully (Direction only)', async () => {
      const user = createMockUser({ role: { name: UserRole.DIRECTION } });
      const closedRecords = [
        {
          ...mockRecord,
          month_status: MonthStatus.CLOSED,
        },
      ];

      mockAccountingRepository.find.mockResolvedValue(closedRecords);
      mockAccountingRepository.update.mockResolvedValue({ affected: 1 });

      await service.reopenMonth(1, 2024, user);

      expect(mockAccountingRepository.update).toHaveBeenCalledWith(
        {
          month: 1,
          year: 2024,
        },
        {
          month_status: MonthStatus.OPEN,
        },
      );
    });

    it('should throw ForbiddenException when non-direction tries to reopen', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });

      await expect(service.reopenMonth(1, 2024, user)).rejects.toThrow(ForbiddenException);
      await expect(service.reopenMonth(1, 2024, user)).rejects.toThrow(
        'Only Direction can reopen closed months',
      );
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException when trying to update closed month record (non-direction)', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const closedRecord = {
        ...mockRecord,
        month_status: MonthStatus.CLOSED,
      };

      mockAccountingRepository.findOne.mockResolvedValue(closedRecord);

      await expect(
        service.update('record-id', { amount: 20000 }, user),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update('record-id', { amount: 20000 }, user),
      ).rejects.toThrow('closed month');
    });
  });
});

