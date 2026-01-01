import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CashboxesService } from './cashboxes.service';
import { Cashbox } from './cashboxes.entity';
import { User } from '../users/user.entity';
import { CashMovement } from '../cash-movements/cash-movements.entity';
import { AlertsService } from '../alerts/alerts.service';
import { CreateCashboxDto } from './dto/create-cashbox.dto';
import { CloseCashboxDto } from './dto/close-cashbox.dto';
import { ApproveDifferenceDto } from './dto/approve-difference.dto';
import { CashboxStatus, UserRole } from '../common/enums';
import { CashMovementType } from '../common/enums/cash-movement-type.enum';
import { Currency } from '../common/enums/currency.enum';
import { createMockUser } from '../common/test/test-helpers';

describe('CashboxesService', () => {
  let service: CashboxesService;
  let cashboxRepository: Repository<Cashbox>;
  let userRepository: Repository<User>;
  let cashMovementRepository: Repository<CashMovement>;
  let alertsService: AlertsService;

  const mockCashboxRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
    })),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockCashMovementRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockAlertsService = {
    createAlert: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  const mockCashbox: Cashbox = {
    id: 'cashbox-id',
    user_id: 'user-id',
    status: CashboxStatus.OPEN,
    opening_balance_ars: 10000,
    opening_balance_usd: 100,
    closing_balance_ars: 0,
    closing_balance_usd: 0,
    difference_ars: 0,
    difference_usd: 0,
    difference_approved: false,
    difference_approved_by_id: null,
    difference_approved_at: null,
    opening_date: new Date(),
    closing_date: null,
    created_at: new Date(),
    updated_at: new Date(),
    movements: [],
    user: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashboxesService,
        {
          provide: getRepositoryToken(Cashbox),
          useValue: mockCashboxRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(CashMovement),
          useValue: mockCashMovementRepository,
        },
        {
          provide: AlertsService,
          useValue: mockAlertsService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<CashboxesService>(CashboxesService);
    cashboxRepository = module.get<Repository<Cashbox>>(getRepositoryToken(Cashbox));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    cashMovementRepository = module.get<Repository<CashMovement>>(
      getRepositoryToken(CashMovement),
    );
    alertsService = module.get<AlertsService>(AlertsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create cashbox successfully', async () => {
      const user = createMockUser();
      const createDto: CreateCashboxDto = {
        user_id: user.id,
        opening_balance_ars: 10000,
        opening_balance_usd: 100,
        opening_date: '2024-01-15',
      };

      mockCashboxRepository.findOne.mockResolvedValue(null);
      mockCashboxRepository.create.mockReturnValue({
        ...createDto,
        id: 'cashbox-id',
        status: CashboxStatus.OPEN,
      });
      mockCashboxRepository.save.mockResolvedValue({
        id: 'cashbox-id',
        ...createDto,
        status: CashboxStatus.OPEN,
      });

      const result = await service.create(createDto, user);

      expect(result).toBeDefined();
      expect(result.status).toBe(CashboxStatus.OPEN);
      expect(mockCashboxRepository.findOne).toHaveBeenCalledWith({
        where: {
          user_id: user.id,
          status: CashboxStatus.OPEN,
        },
      });
    });

    it('should throw BadRequestException when user already has open cashbox', async () => {
      const user = createMockUser();
      const createDto: CreateCashboxDto = {
        user_id: user.id,
        opening_date: '2024-01-15',
      };

      mockCashboxRepository.findOne.mockResolvedValue(mockCashbox);

      await expect(service.create(createDto, user)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto, user)).rejects.toThrow(
        'User already has an open cashbox',
      );
    });
  });

  describe('close', () => {
    it('should close cashbox and calculate differences correctly with formula', async () => {
      const user = createMockUser();
      const closeDto: CloseCashboxDto = {
        closing_balance_ars: 12000,
        closing_balance_usd: 120,
        closing_date: '2024-01-16',
      };

      // Mock cashbox with opening balance
      const cashboxWithMovements = {
        ...mockCashbox,
        opening_balance_ars: 10000,
        opening_balance_usd: 100,
      };

      // Mock movements: ingresos 3000 ARS, 30 USD; egresos 2000 ARS, 20 USD
      const mockMovements: CashMovement[] = [
        {
          id: 'movement-1',
          cashbox_id: 'cashbox-id',
          type: CashMovementType.INCOME,
          amount: 3000,
          currency: Currency.ARS,
          description: 'Ingreso 1',
          expense_id: null,
          income_id: 'income-1',
          date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          cashbox: null,
          expense: null,
          income: null,
        },
        {
          id: 'movement-2',
          cashbox_id: 'cashbox-id',
          type: CashMovementType.INCOME,
          amount: 30,
          currency: Currency.USD,
          description: 'Ingreso USD',
          expense_id: null,
          income_id: 'income-2',
          date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          cashbox: null,
          expense: null,
          income: null,
        },
        {
          id: 'movement-3',
          cashbox_id: 'cashbox-id',
          type: CashMovementType.EXPENSE,
          amount: 2000,
          currency: Currency.ARS,
          description: 'Egreso 1',
          expense_id: 'expense-1',
          income_id: null,
          date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          cashbox: null,
          expense: null,
          income: null,
        },
        {
          id: 'movement-4',
          cashbox_id: 'cashbox-id',
          type: CashMovementType.EXPENSE,
          amount: 20,
          currency: Currency.USD,
          description: 'Egreso USD',
          expense_id: 'expense-2',
          income_id: null,
          date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          cashbox: null,
          expense: null,
          income: null,
        },
      ];

      mockCashboxRepository.findOne.mockResolvedValue(cashboxWithMovements);
      mockQueryRunner.manager.find.mockResolvedValue(mockMovements);
      mockQueryRunner.manager.save.mockResolvedValue({
        ...cashboxWithMovements,
        ...closeDto,
        // Expected difference ARS: 12000 - (10000 + 3000 - 2000) = 12000 - 11000 = 1000
        // Expected difference USD: 120 - (100 + 30 - 20) = 120 - 110 = 10
        difference_ars: 1000,
        difference_usd: 10,
        status: CashboxStatus.CLOSED,
      });

      const result = await service.close('cashbox-id', closeDto, user);

      expect(result.status).toBe(CashboxStatus.CLOSED);
      expect(result.difference_ars).toBe(1000);
      expect(result.difference_usd).toBe(10);
      expect(mockQueryRunner.manager.find).toHaveBeenCalledWith(
        expect.any(Function), // CashMovement entity
        { where: { cashbox_id: 'cashbox-id' } },
      );
      expect(mockAlertsService.createAlert).toHaveBeenCalled();
    });

    it('should calculate zero difference when closing balance matches expected', async () => {
      const user = createMockUser();
      const closeDto: CloseCashboxDto = {
        closing_balance_ars: 11000, // opening (10000) + ingresos (3000) - egresos (2000) = 11000
        closing_balance_usd: 110, // opening (100) + ingresos (30) - egresos (20) = 110
        closing_date: '2024-01-16',
      };

      const cashboxWithMovements = {
        ...mockCashbox,
        opening_balance_ars: 10000,
        opening_balance_usd: 100,
      };

      const mockMovements: CashMovement[] = [
        {
          id: 'movement-1',
          cashbox_id: 'cashbox-id',
          type: CashMovementType.INCOME,
          amount: 3000,
          currency: Currency.ARS,
          description: 'Ingreso',
          expense_id: null,
          income_id: 'income-1',
          date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          cashbox: null,
          expense: null,
          income: null,
        },
        {
          id: 'movement-2',
          cashbox_id: 'cashbox-id',
          type: CashMovementType.EXPENSE,
          amount: 2000,
          currency: Currency.ARS,
          description: 'Egreso',
          expense_id: 'expense-1',
          income_id: null,
          date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          cashbox: null,
          expense: null,
          income: null,
        },
        {
          id: 'movement-3',
          cashbox_id: 'cashbox-id',
          type: CashMovementType.INCOME,
          amount: 30,
          currency: Currency.USD,
          description: 'Ingreso USD',
          expense_id: null,
          income_id: 'income-2',
          date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          cashbox: null,
          expense: null,
          income: null,
        },
        {
          id: 'movement-4',
          cashbox_id: 'cashbox-id',
          type: CashMovementType.EXPENSE,
          amount: 20,
          currency: Currency.USD,
          description: 'Egreso USD',
          expense_id: 'expense-2',
          income_id: null,
          date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          cashbox: null,
          expense: null,
          income: null,
        },
      ];

      mockCashboxRepository.findOne.mockResolvedValue(cashboxWithMovements);
      mockQueryRunner.manager.find.mockResolvedValue(mockMovements);
      mockQueryRunner.manager.save.mockResolvedValue({
        ...cashboxWithMovements,
        ...closeDto,
        difference_ars: 0,
        difference_usd: 0,
        status: CashboxStatus.CLOSED,
      });

      const result = await service.close('cashbox-id', closeDto, user);

      expect(result.status).toBe(CashboxStatus.CLOSED);
      expect(result.difference_ars).toBe(0);
      expect(result.difference_usd).toBe(0);
      // Should not generate alert when difference is zero
      expect(mockAlertsService.createAlert).not.toHaveBeenCalled();
    });

    it('should handle negative differences correctly', async () => {
      const user = createMockUser();
      const closeDto: CloseCashboxDto = {
        closing_balance_ars: 10500, // Less than expected (11000)
        closing_balance_usd: 105, // Less than expected (110)
        closing_date: '2024-01-16',
      };

      const cashboxWithMovements = {
        ...mockCashbox,
        opening_balance_ars: 10000,
        opening_balance_usd: 100,
      };

      const mockMovements: CashMovement[] = [
        {
          id: 'movement-1',
          cashbox_id: 'cashbox-id',
          type: CashMovementType.INCOME,
          amount: 3000,
          currency: Currency.ARS,
          description: 'Ingreso',
          expense_id: null,
          income_id: 'income-1',
          date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          cashbox: null,
          expense: null,
          income: null,
        },
        {
          id: 'movement-2',
          cashbox_id: 'cashbox-id',
          type: CashMovementType.EXPENSE,
          amount: 2000,
          currency: Currency.ARS,
          description: 'Egreso',
          expense_id: 'expense-1',
          income_id: null,
          date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          cashbox: null,
          expense: null,
          income: null,
        },
        {
          id: 'movement-3',
          cashbox_id: 'cashbox-id',
          type: CashMovementType.INCOME,
          amount: 30,
          currency: Currency.USD,
          description: 'Ingreso USD',
          expense_id: null,
          income_id: 'income-2',
          date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          cashbox: null,
          expense: null,
          income: null,
        },
        {
          id: 'movement-4',
          cashbox_id: 'cashbox-id',
          type: CashMovementType.EXPENSE,
          amount: 20,
          currency: Currency.USD,
          description: 'Egreso USD',
          expense_id: 'expense-2',
          income_id: null,
          date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
          cashbox: null,
          expense: null,
          income: null,
        },
      ];

      mockCashboxRepository.findOne.mockResolvedValue(cashboxWithMovements);
      mockQueryRunner.manager.find.mockResolvedValue(mockMovements);
      mockQueryRunner.manager.save.mockResolvedValue({
        ...cashboxWithMovements,
        ...closeDto,
        // Expected difference ARS: 10500 - (10000 + 3000 - 2000) = 10500 - 11000 = -500
        // Expected difference USD: 105 - (100 + 30 - 20) = 105 - 110 = -5
        difference_ars: -500,
        difference_usd: -5,
        status: CashboxStatus.CLOSED,
      });

      const result = await service.close('cashbox-id', closeDto, user);

      expect(result.status).toBe(CashboxStatus.CLOSED);
      expect(result.difference_ars).toBe(-500);
      expect(result.difference_usd).toBe(-5);
      // Should generate alert even for negative differences
      expect(mockAlertsService.createAlert).toHaveBeenCalled();
    });

    it('should throw BadRequestException when cashbox is already closed', async () => {
      const user = createMockUser();
      const closedCashbox = { ...mockCashbox, status: CashboxStatus.CLOSED };
      const closeDto: CloseCashboxDto = {
        closing_balance_ars: 9500,
      };

      mockCashboxRepository.findOne.mockResolvedValue(closedCashbox);

      await expect(service.close('cashbox-id', closeDto, user)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.close('cashbox-id', closeDto, user)).rejects.toThrow(
        'Cashbox is already closed',
      );
    });
  });

  describe('approveDifference', () => {
    it('should approve difference successfully', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const cashboxWithDifference = {
        ...mockCashbox,
        difference_ars: 500,
        difference_approved: false,
      };
      const approveDto: ApproveDifferenceDto = {};

      mockCashboxRepository.findOne.mockResolvedValue(cashboxWithDifference);
      mockCashboxRepository.save.mockResolvedValue({
        ...cashboxWithDifference,
        difference_approved: true,
        difference_approved_by_id: user.id,
        difference_approved_at: new Date(),
      });

      const result = await service.approveDifference('cashbox-id', approveDto, user);

      expect(result.difference_approved).toBe(true);
      expect(result.difference_approved_by_id).toBe(user.id);
    });

    it('should throw ForbiddenException when non-admin tries to approve', async () => {
      const user = createMockUser({ role: { name: UserRole.OPERATOR } });
      const approveDto: ApproveDifferenceDto = {};

      await expect(
        service.approveDifference('cashbox-id', approveDto, user),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.approveDifference('cashbox-id', approveDto, user),
      ).rejects.toThrow('Only Administration and Direction can approve');
    });

    it('should throw BadRequestException when difference already approved', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const cashboxWithApprovedDifference = {
        ...mockCashbox,
        difference_approved: true,
      };
      const approveDto: ApproveDifferenceDto = {};

      mockCashboxRepository.findOne.mockResolvedValue(cashboxWithApprovedDifference);

      await expect(
        service.approveDifference('cashbox-id', approveDto, user),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.approveDifference('cashbox-id', approveDto, user),
      ).rejects.toThrow('Difference is already approved');
    });
  });

  describe('findAll', () => {
    it('should return all cashboxes for Direction role (no filter)', async () => {
      const user = createMockUser({ role: { name: UserRole.DIRECTION } });
      const cashboxes = [mockCashbox, { ...mockCashbox, id: 'cashbox-id-2', user_id: 'other-user-id' }];

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(cashboxes),
        getOne: jest.fn(),
      };
      mockCashboxRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll(user);

      expect(result).toEqual(cashboxes);
      expect(mockCashboxRepository.createQueryBuilder).toHaveBeenCalledWith('cashbox');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('cashbox.user', 'user');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('cashbox.movements', 'movements');
    });

    it('should return all cashboxes for Administration role (no filter)', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const cashboxes = [mockCashbox, { ...mockCashbox, id: 'cashbox-id-2', user_id: 'other-user-id' }];

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(cashboxes),
        getOne: jest.fn(),
      };
      mockCashboxRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll(user);

      expect(result).toEqual(cashboxes);
      expect(mockCashboxRepository.createQueryBuilder).toHaveBeenCalledWith('cashbox');
    });

    it('should return all cashboxes for Supervisor role (no filter)', async () => {
      const user = createMockUser({ role: { name: UserRole.SUPERVISOR } });
      const cashboxes = [mockCashbox, { ...mockCashbox, id: 'cashbox-id-2', user_id: 'other-user-id' }];

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(cashboxes),
        getOne: jest.fn(),
      };
      mockCashboxRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll(user);

      expect(result).toEqual(cashboxes);
      expect(mockCashboxRepository.createQueryBuilder).toHaveBeenCalledWith('cashbox');
      // Verify no where clause is applied - Supervisor sees all cashboxes
      expect(queryBuilder.where).not.toHaveBeenCalled();
    });

    it('should return only user cashboxes for Operator role (with filter)', async () => {
      const user = createMockUser({ role: { name: UserRole.OPERATOR } });
      const cashboxes = [mockCashbox];

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(cashboxes),
        getOne: jest.fn(),
      };
      mockCashboxRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll(user);

      expect(result).toEqual(cashboxes);
      expect(mockCashboxRepository.createQueryBuilder).toHaveBeenCalledWith('cashbox');
      expect(queryBuilder.where).toHaveBeenCalledWith('cashbox.user_id = :userId', { userId: user.id });
    });

    it('should return empty array for unknown role', async () => {
      const user = createMockUser({ role: { name: 'unknown-role' as any } });

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getOne: jest.fn(),
      };
      mockCashboxRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll(user);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return cashbox when found', async () => {
      const user = createMockUser();
      mockCashboxRepository.findOne.mockResolvedValue(mockCashbox);

      const result = await service.findOne('cashbox-id', user);

      expect(result).toEqual(mockCashbox);
    });

    it('should throw NotFoundException when cashbox not found', async () => {
      const user = createMockUser();
      mockCashboxRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent', user)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when operator tries to access other user cashbox', async () => {
      const user = createMockUser({ role: { name: UserRole.OPERATOR } });
      const otherUserCashbox = { ...mockCashbox, user_id: 'other-user-id' };

      mockCashboxRepository.findOne.mockResolvedValue(otherUserCashbox);

      await expect(service.findOne('cashbox-id', user)).rejects.toThrow(ForbiddenException);
    });
  });
});

