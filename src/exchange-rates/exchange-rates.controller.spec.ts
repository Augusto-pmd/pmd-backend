import { Test, TestingModule } from '@nestjs/testing';
import { ExchangeRatesController } from './exchange-rates.controller';
import { ExchangeRatesService } from './exchange-rates.service';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { UpdateExchangeRateDto } from './dto/update-exchange-rate.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { createMockUser } from '../common/test/test-helpers';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

describe('ExchangeRatesController', () => {
  let controller: ExchangeRatesController;
  let service: ExchangeRatesService;

  const mockExchangeRate = {
    id: 'exchange-rate-id',
    date: new Date('2024-01-15'),
    rate_ars_to_usd: 0.0012,
    rate_usd_to_ars: 850.5,
    created_by_id: 'user-id',
    created_by: {
      id: 'user-id',
      fullName: 'Test User',
      email: 'test@example.com',
    },
    created_at: new Date(),
  };

  const mockExchangeRatesService = {
    create: jest.fn(),
    getCurrentRate: jest.fn(),
    getRateByDate: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExchangeRatesController],
      providers: [
        {
          provide: ExchangeRatesService,
          useValue: mockExchangeRatesService,
        },
      ],
    }).compile();

    controller = module.get<ExchangeRatesController>(ExchangeRatesController);
    service = module.get<ExchangeRatesService>(ExchangeRatesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create exchange rate successfully', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const createDto: CreateExchangeRateDto = {
        date: '2024-01-15',
        rate_ars_to_usd: 0.0012,
        rate_usd_to_ars: 850.5,
      };

      mockExchangeRatesService.create.mockResolvedValue(mockExchangeRate);

      const req = { user };
      const result = await controller.create(createDto, req);

      expect(result).toEqual(mockExchangeRate);
      expect(service.create).toHaveBeenCalledWith(createDto, user);
    });

    it('should throw error when user is not Administration', async () => {
      const user = createMockUser({ role: { name: UserRole.OPERATOR } });
      const createDto: CreateExchangeRateDto = {
        date: '2024-01-15',
        rate_ars_to_usd: 0.0012,
        rate_usd_to_ars: 850.5,
      };

      mockExchangeRatesService.create.mockRejectedValue(
        new ForbiddenException('Only Administration can create exchange rates'),
      );

      const req = { user };
      await expect(controller.create(createDto, req)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getCurrent', () => {
    it('should return current exchange rate', async () => {
      mockExchangeRatesService.getCurrentRate.mockResolvedValue(mockExchangeRate);

      const result = await controller.getCurrent();

      expect(result).toEqual(mockExchangeRate);
      expect(service.getCurrentRate).toHaveBeenCalled();
    });

    it('should return null when no current rate exists', async () => {
      mockExchangeRatesService.getCurrentRate.mockResolvedValue(null);

      const result = await controller.getCurrent();

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all exchange rates when no date query', async () => {
      const rates = [mockExchangeRate, { ...mockExchangeRate, id: 'rate-2' }];
      mockExchangeRatesService.findAll.mockResolvedValue(rates);

      const result = await controller.findAll();

      expect(result).toEqual(rates);
      expect(service.findAll).toHaveBeenCalled();
      expect(service.getRateByDate).not.toHaveBeenCalled();
    });

    it('should return exchange rate by date when date query provided', async () => {
      const date = '2024-01-15';
      mockExchangeRatesService.getRateByDate.mockResolvedValue(mockExchangeRate);

      const result = await controller.findAll(date);

      expect(result).toEqual(mockExchangeRate);
      expect(service.getRateByDate).toHaveBeenCalledWith(date);
      expect(service.findAll).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return exchange rate by ID', async () => {
      mockExchangeRatesService.findOne.mockResolvedValue(mockExchangeRate);

      const result = await controller.findOne('exchange-rate-id');

      expect(result).toEqual(mockExchangeRate);
      expect(service.findOne).toHaveBeenCalledWith('exchange-rate-id');
    });

    it('should throw NotFoundException when exchange rate not found', async () => {
      mockExchangeRatesService.findOne.mockRejectedValue(
        new NotFoundException('Exchange rate with ID exchange-rate-id not found'),
      );

      await expect(controller.findOne('exchange-rate-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update exchange rate successfully', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const updateDto: UpdateExchangeRateDto = {
        rate_usd_to_ars: 900,
      };
      const updatedRate = { ...mockExchangeRate, ...updateDto };

      mockExchangeRatesService.update.mockResolvedValue(updatedRate);

      const req = { user };
      const result = await controller.update('exchange-rate-id', updateDto, req);

      expect(result).toEqual(updatedRate);
      expect(service.update).toHaveBeenCalledWith(
        'exchange-rate-id',
        updateDto,
        user,
      );
    });

    it('should throw error when user is not Administration', async () => {
      const user = createMockUser({ role: { name: UserRole.OPERATOR } });
      const updateDto: UpdateExchangeRateDto = {
        rate_usd_to_ars: 900,
      };

      mockExchangeRatesService.update.mockRejectedValue(
        new ForbiddenException('Only Administration can update exchange rates'),
      );

      const req = { user };
      await expect(
        controller.update('exchange-rate-id', updateDto, req),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete exchange rate successfully', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });

      mockExchangeRatesService.remove.mockResolvedValue(undefined);

      const req = { user };
      const result = await controller.remove('exchange-rate-id', req);

      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith('exchange-rate-id', user);
    });

    it('should throw error when user is not Administration', async () => {
      const user = createMockUser({ role: { name: UserRole.OPERATOR } });

      mockExchangeRatesService.remove.mockRejectedValue(
        new ForbiddenException('Only Administration can delete exchange rates'),
      );

      const req = { user };
      await expect(controller.remove('exchange-rate-id', req)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});

