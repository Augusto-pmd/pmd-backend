import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CashboxesService } from './cashboxes.service';
import { Cashbox } from './cashboxes.entity';
import { User } from '../users/user.entity';
import { AlertsService } from '../alerts/alerts.service';
import { CreateCashboxDto } from './dto/create-cashbox.dto';
import { CloseCashboxDto } from './dto/close-cashbox.dto';
import { ApproveDifferenceDto } from './dto/approve-difference.dto';
import { CashboxStatus, UserRole } from '../common/enums';
import { createMockUser } from '../common/test/test-helpers';

describe('CashboxesService', () => {
  let service: CashboxesService;
  let cashboxRepository: Repository<Cashbox>;
  let userRepository: Repository<User>;
  let alertsService: AlertsService;

  const mockCashboxRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockAlertsService = {
    createAlert: jest.fn(),
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
          provide: AlertsService,
          useValue: mockAlertsService,
        },
      ],
    }).compile();

    service = module.get<CashboxesService>(CashboxesService);
    cashboxRepository = module.get<Repository<Cashbox>>(getRepositoryToken(Cashbox));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
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
    it('should close cashbox and calculate differences', async () => {
      const user = createMockUser();
      const closeDto: CloseCashboxDto = {
        closing_balance_ars: 9500,
        closing_balance_usd: 95,
        closing_date: '2024-01-16',
      };

      mockCashboxRepository.findOne.mockResolvedValue(mockCashbox);
      mockCashboxRepository.save.mockResolvedValue({
        ...mockCashbox,
        ...closeDto,
        difference_ars: -500,
        difference_usd: -5,
        status: CashboxStatus.CLOSED,
      });

      const result = await service.close('cashbox-id', closeDto, user);

      expect(result.status).toBe(CashboxStatus.CLOSED);
      expect(result.difference_ars).toBe(-500);
      expect(result.difference_usd).toBe(-5);
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
    it('should return all cashboxes for non-operator users', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const cashboxes = [mockCashbox];

      mockCashboxRepository.find.mockResolvedValue(cashboxes);

      const result = await service.findAll(user);

      expect(result).toEqual(cashboxes);
      expect(mockCashboxRepository.find).toHaveBeenCalledWith({
        where: {},
        relations: ['user', 'movements'],
        order: { created_at: 'DESC' },
      });
    });

    it('should return only user cashboxes for operators', async () => {
      const user = createMockUser({ role: { name: UserRole.OPERATOR } });
      const cashboxes = [mockCashbox];

      mockCashboxRepository.find.mockResolvedValue(cashboxes);

      const result = await service.findAll(user);

      expect(result).toEqual(cashboxes);
      expect(mockCashboxRepository.find).toHaveBeenCalledWith({
        where: { user_id: user.id },
        relations: ['user', 'movements'],
        order: { created_at: 'DESC' },
      });
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

