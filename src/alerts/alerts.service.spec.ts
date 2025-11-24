import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { Alert } from './alerts.entity';
import { SupplierDocument } from '../supplier-documents/supplier-documents.entity';
import { Expense } from '../expenses/expenses.entity';
import { Contract } from '../contracts/contracts.entity';
import { Schedule } from '../schedule/schedule.entity';
import { CreateAlertDto } from './dto/create-alert.dto';
import { AlertType, AlertSeverity, ExpenseState, ScheduleState, SupplierDocumentType, UserRole } from '../common/enums';
import { createMockUser } from '../common/test/test-helpers';

describe('AlertsService', () => {
  let service: AlertsService;
  let alertRepository: Repository<Alert>;
  let supplierDocumentRepository: Repository<SupplierDocument>;
  let expenseRepository: Repository<Expense>;
  let scheduleRepository: Repository<Schedule>;

  const mockAlertRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockSupplierDocumentRepository = {
    find: jest.fn(),
  };

  const mockExpenseRepository = {
    find: jest.fn(),
  };

  const mockContractRepository = {
    find: jest.fn(),
  };

  const mockScheduleRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: getRepositoryToken(Alert),
          useValue: mockAlertRepository,
        },
        {
          provide: getRepositoryToken(SupplierDocument),
          useValue: mockSupplierDocumentRepository,
        },
        {
          provide: getRepositoryToken(Expense),
          useValue: mockExpenseRepository,
        },
        {
          provide: getRepositoryToken(Contract),
          useValue: mockContractRepository,
        },
        {
          provide: getRepositoryToken(Schedule),
          useValue: mockScheduleRepository,
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    alertRepository = module.get<Repository<Alert>>(getRepositoryToken(Alert));
    supplierDocumentRepository = module.get<Repository<SupplierDocument>>(
      getRepositoryToken(SupplierDocument),
    );
    expenseRepository = module.get<Repository<Expense>>(getRepositoryToken(Expense));
    scheduleRepository = module.get<Repository<Schedule>>(getRepositoryToken(Schedule));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAlert', () => {
    it('should create alert successfully', async () => {
      const createDto: CreateAlertDto = {
        type: AlertType.EXPIRED_DOCUMENTATION,
        severity: AlertSeverity.CRITICAL,
        title: 'Test Alert',
        message: 'Test message',
      };

      mockAlertRepository.create.mockReturnValue({
        ...createDto,
        id: 'alert-id',
      });
      mockAlertRepository.save.mockResolvedValue({
        id: 'alert-id',
        ...createDto,
      });

      const result = await service.createAlert(createDto);

      expect(result).toBeDefined();
      expect(result.type).toBe(AlertType.EXPIRED_DOCUMENTATION);
    });
  });

  describe('checkExpiredDocumentation', () => {
    it('should generate alerts for expired documents', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      const expiredDoc = {
        id: 'doc-id',
        document_type: SupplierDocumentType.ART,
        expiration_date: expiredDate,
        is_valid: true,
        supplier: {
          id: 'supplier-id',
          name: 'Test Supplier',
        },
      };

      mockSupplierDocumentRepository.find.mockResolvedValue([expiredDoc]);
      mockAlertRepository.create.mockReturnValue({});
      mockAlertRepository.save.mockResolvedValue({});

      await service.checkExpiredDocumentation();

      expect(mockAlertRepository.create).toHaveBeenCalled();
      expect(mockAlertRepository.save).toHaveBeenCalled();
    });
  });

  describe('checkPendingValidations', () => {
    it('should generate alerts for pending expenses older than 7 days', async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 8);

      const pendingExpense = {
        id: 'expense-id',
        state: ExpenseState.PENDING,
        created_at: sevenDaysAgo,
        created_by_id: 'user-id',
      };

      mockExpenseRepository.find.mockResolvedValue([pendingExpense]);
      mockAlertRepository.create.mockReturnValue({});
      mockAlertRepository.save.mockResolvedValue({});

      await service.checkPendingValidations();

      expect(mockAlertRepository.create).toHaveBeenCalled();
    });
  });

  describe('checkOverdueStages', () => {
    it('should generate alerts for overdue stages', async () => {
      const today = new Date();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const overdueStage = {
        id: 'stage-id',
        work_id: 'work-id',
        stage_name: 'Test Stage',
        end_date: pastDate,
        actual_end_date: null,
        state: ScheduleState.IN_PROGRESS,
      };

      mockScheduleRepository.find.mockResolvedValue([overdueStage]);
      mockAlertRepository.create.mockReturnValue({});
      mockAlertRepository.save.mockResolvedValue({});

      await service.checkOverdueStages();

      expect(mockAlertRepository.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all alerts for non-operator users', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const alerts = [
        {
          id: 'alert-1',
          type: AlertType.EXPIRED_DOCUMENTATION,
        },
      ];

      mockAlertRepository.find.mockResolvedValue(alerts);

      const result = await service.findAll(user);

      expect(result).toEqual(alerts);
      expect(mockAlertRepository.find).toHaveBeenCalledWith({
        where: {},
        relations: expect.any(Array),
        order: { created_at: 'DESC' },
      });
    });

    it('should return only user alerts for operators', async () => {
      const user = createMockUser({ role: { name: UserRole.OPERATOR } });
      const alerts = [
        {
          id: 'alert-1',
          user_id: user.id,
        },
      ];

      mockAlertRepository.find.mockResolvedValue(alerts);

      const result = await service.findAll(user);

      expect(result).toEqual(alerts);
      expect(mockAlertRepository.find).toHaveBeenCalledWith({
        where: { user_id: user.id },
        relations: expect.any(Array),
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when alert not found', async () => {
      const user = createMockUser();
      mockAlertRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent', user)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when operator tries to access other user alert', async () => {
      const user = createMockUser({ role: { name: UserRole.OPERATOR } });
      const alert = {
        id: 'alert-id',
        user_id: 'other-user-id',
      };

      mockAlertRepository.findOne.mockResolvedValue(alert);

      await expect(service.findOne('alert-id', user)).rejects.toThrow(ForbiddenException);
    });
  });
});

