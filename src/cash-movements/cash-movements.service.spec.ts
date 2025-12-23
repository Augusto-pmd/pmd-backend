import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CashMovementsService } from './cash-movements.service';
import { CashMovement } from './cash-movements.entity';
import { Cashbox } from '../cashboxes/cashboxes.entity';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { CashboxStatus } from '../common/enums/cashbox-status.enum';
import { CashMovementType } from '../common/enums/cash-movement-type.enum';
import { Currency } from '../common/enums/currency.enum';
import { createMockUser } from '../common/test/test-helpers';

describe('CashMovementsService', () => {
  let service: CashMovementsService;
  let cashMovementRepository: Repository<CashMovement>;
  let cashboxRepository: Repository<Cashbox>;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const mockCashMovementRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockCashboxRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
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

  const mockCashMovement: CashMovement = {
    id: 'movement-id',
    cashbox_id: 'cashbox-id',
    type: CashMovementType.REFILL,
    amount: 5000,
    currency: Currency.ARS,
    description: 'Refuerzo de caja',
    expense_id: null,
    income_id: null,
    date: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    cashbox: mockCashbox,
    expense: null,
    income: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashMovementsService,
        {
          provide: getRepositoryToken(CashMovement),
          useValue: mockCashMovementRepository,
        },
        {
          provide: getRepositoryToken(Cashbox),
          useValue: mockCashboxRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<CashMovementsService>(CashMovementsService);
    cashMovementRepository = module.get<Repository<CashMovement>>(
      getRepositoryToken(CashMovement),
    );
    cashboxRepository = module.get<Repository<Cashbox>>(
      getRepositoryToken(Cashbox),
    );
    dataSource = module.get<DataSource>(DataSource);
    queryRunner = mockQueryRunner as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create movement and update cashbox balance for REFILL in ARS', async () => {
      const user = createMockUser();
      const createDto: CreateCashMovementDto = {
        cashbox_id: 'cashbox-id',
        type: CashMovementType.REFILL,
        amount: 5000,
        currency: Currency.ARS,
        date: '2024-01-15',
      };

      // Setup mocks
      mockQueryRunner.manager.findOne.mockResolvedValue(mockCashbox);
      mockQueryRunner.manager.create.mockReturnValue(mockCashMovement);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce(mockCashMovement) // Save movement
        .mockResolvedValueOnce({
          ...mockCashbox,
          opening_balance_ars: 15000, // Updated balance
        }); // Save cashbox
      mockCashMovementRepository.findOne.mockResolvedValue({
        ...mockCashMovement,
        cashbox: { ...mockCashbox, opening_balance_ars: 15000 },
      });

      const result = await service.create(createDto, user);

      expect(result).toBeDefined();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(
        Cashbox,
        expect.objectContaining({
          where: { id: createDto.cashbox_id },
        }),
      );
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(2);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();

      // Verify cashbox balance was updated
      const cashboxSaveCalls = mockQueryRunner.manager.save.mock.calls;
      // The second call should be for Cashbox (first is for CashMovement)
      const cashboxSaveCall = cashboxSaveCalls[1];
      expect(cashboxSaveCall).toBeDefined();
      expect(cashboxSaveCall[0]).toBe(Cashbox);
      const updatedCashbox = cashboxSaveCall[1];
      expect(updatedCashbox.opening_balance_ars).toBe(15000);
    });

    it('should create movement and update cashbox balance for REFILL in USD', async () => {
      const user = createMockUser();
      const createDto: CreateCashMovementDto = {
        cashbox_id: 'cashbox-id',
        type: CashMovementType.REFILL,
        amount: 50,
        currency: Currency.USD,
        date: '2024-01-15',
      };

      // Setup mocks
      mockQueryRunner.manager.findOne.mockResolvedValue(mockCashbox);
      mockQueryRunner.manager.create.mockReturnValue(mockCashMovement);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce(mockCashMovement) // Save movement
        .mockResolvedValueOnce({
          ...mockCashbox,
          opening_balance_usd: 150, // Updated balance
        }); // Save cashbox
      mockCashMovementRepository.findOne.mockResolvedValue({
        ...mockCashMovement,
        cashbox: { ...mockCashbox, opening_balance_usd: 150 },
      });

      const result = await service.create(createDto, user);

      expect(result).toBeDefined();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();

      // Verify cashbox balance was updated
      const cashboxSaveCalls = mockQueryRunner.manager.save.mock.calls;
      // The second call should be for Cashbox (first is for CashMovement)
      const cashboxSaveCall = cashboxSaveCalls[1];
      expect(cashboxSaveCall).toBeDefined();
      expect(cashboxSaveCall[0]).toBe(Cashbox);
      const updatedCashbox = cashboxSaveCall[1];
      expect(updatedCashbox.opening_balance_usd).toBe(150);
    });

    it('should create movement without updating balance for non-REFILL types', async () => {
      const user = createMockUser();
      const createDto: CreateCashMovementDto = {
        cashbox_id: 'cashbox-id',
        type: CashMovementType.EXPENSE,
        amount: 2000,
        currency: Currency.ARS,
        date: '2024-01-15',
      };

      // Setup mocks
      mockQueryRunner.manager.findOne.mockResolvedValue(mockCashbox);
      mockQueryRunner.manager.create.mockReturnValue({
        ...mockCashMovement,
        type: CashMovementType.EXPENSE,
      });
      mockQueryRunner.manager.save.mockResolvedValueOnce({
        ...mockCashMovement,
        type: CashMovementType.EXPENSE,
      });
      mockCashMovementRepository.findOne.mockResolvedValue({
        ...mockCashMovement,
        type: CashMovementType.EXPENSE,
      });

      const result = await service.create(createDto, user);

      expect(result).toBeDefined();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      // Should only save movement, not cashbox
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when cashbox does not exist', async () => {
      const user = createMockUser();
      const createDto: CreateCashMovementDto = {
        cashbox_id: 'non-existent-id',
        type: CashMovementType.REFILL,
        amount: 5000,
        currency: Currency.ARS,
        date: '2024-01-15',
      };

      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, user)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto, user)).rejects.toThrow(
        'Cashbox with ID non-existent-id not found',
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw BadRequestException when cashbox is closed', async () => {
      const user = createMockUser();
      const createDto: CreateCashMovementDto = {
        cashbox_id: 'cashbox-id',
        type: CashMovementType.REFILL,
        amount: 5000,
        currency: Currency.ARS,
        date: '2024-01-15',
      };

      const closedCashbox = {
        ...mockCashbox,
        status: CashboxStatus.CLOSED,
      };

      mockQueryRunner.manager.findOne.mockResolvedValue(closedCashbox);

      await expect(service.create(createDto, user)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto, user)).rejects.toThrow(
        'Cannot create movement in a closed cashbox',
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const user = createMockUser();
      const createDto: CreateCashMovementDto = {
        cashbox_id: 'cashbox-id',
        type: CashMovementType.REFILL,
        amount: 5000,
        currency: Currency.ARS,
        date: '2024-01-15',
      };

      mockQueryRunner.manager.findOne.mockResolvedValue(mockCashbox);
      mockQueryRunner.manager.save.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.create(createDto, user)).rejects.toThrow(
        'Database error',
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
});

