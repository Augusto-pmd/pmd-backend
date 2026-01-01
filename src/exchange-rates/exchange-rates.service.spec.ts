import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { ExchangeRate } from './exchange-rates.entity';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { UpdateExchangeRateDto } from './dto/update-exchange-rate.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { createMockUser } from '../common/test/test-helpers';

describe('ExchangeRatesService', () => {
  let service: ExchangeRatesService;
  let exchangeRateRepository: Repository<ExchangeRate>;

  const mockExchangeRateRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockExchangeRate: ExchangeRate = {
    id: 'exchange-rate-id',
    date: new Date('2024-01-15'),
    rate_ars_to_usd: 0.0012,
    rate_usd_to_ars: 850.5,
    created_by_id: 'user-id',
    created_by: {
      id: 'user-id',
      fullName: 'Test User',
      email: 'test@example.com',
    } as any,
    created_at: new Date(),
  } as ExchangeRate;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRatesService,
        {
          provide: getRepositoryToken(ExchangeRate),
          useValue: mockExchangeRateRepository,
        },
      ],
    }).compile();

    service = module.get<ExchangeRatesService>(ExchangeRatesService);
    exchangeRateRepository = module.get<Repository<ExchangeRate>>(
      getRepositoryToken(ExchangeRate),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create exchange rate when user is Administration', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const createDto: CreateExchangeRateDto = {
        date: '2024-01-15',
        rate_ars_to_usd: 0.0012,
        rate_usd_to_ars: 850.5,
      };

      mockExchangeRateRepository.findOne.mockResolvedValue(null);
      mockExchangeRateRepository.create.mockReturnValue({
        ...createDto,
        id: 'exchange-rate-id',
        date: new Date(createDto.date),
        created_by_id: user.id,
      });
      mockExchangeRateRepository.save.mockResolvedValue({
        ...mockExchangeRate,
        ...createDto,
        date: new Date(createDto.date),
        created_by_id: user.id,
      });

      const result = await service.create(createDto, user);

      expect(result).toBeDefined();
      expect(result.date).toEqual(new Date(createDto.date));
      expect(result.rate_ars_to_usd).toBe(createDto.rate_ars_to_usd);
      expect(result.rate_usd_to_ars).toBe(createDto.rate_usd_to_ars);
      expect(mockExchangeRateRepository.findOne).toHaveBeenCalledWith({
        where: { date: new Date(createDto.date) },
      });
      expect(mockExchangeRateRepository.create).toHaveBeenCalled();
      expect(mockExchangeRateRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not Administration', async () => {
      const user = createMockUser({ role: { name: UserRole.OPERATOR } });
      const createDto: CreateExchangeRateDto = {
        date: '2024-01-15',
        rate_ars_to_usd: 0.0012,
        rate_usd_to_ars: 850.5,
      };

      await expect(service.create(createDto, user)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockExchangeRateRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when exchange rate already exists for date', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const createDto: CreateExchangeRateDto = {
        date: '2024-01-15',
        rate_ars_to_usd: 0.0012,
        rate_usd_to_ars: 850.5,
      };

      mockExchangeRateRepository.findOne.mockResolvedValue(mockExchangeRate);

      await expect(service.create(createDto, user)).rejects.toThrow(
        ConflictException,
      );
      expect(mockExchangeRateRepository.findOne).toHaveBeenCalled();
      expect(mockExchangeRateRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentRate', () => {
    it('should return the most recent exchange rate', async () => {
      mockExchangeRateRepository.findOne.mockResolvedValue(mockExchangeRate);

      const result = await service.getCurrentRate();

      expect(result).toEqual(mockExchangeRate);
      expect(mockExchangeRateRepository.findOne).toHaveBeenCalledWith({
        where: {},
        order: { date: 'DESC' },
        relations: ['created_by'],
      });
    });

    it('should return null when no exchange rates exist', async () => {
      mockExchangeRateRepository.findOne.mockResolvedValue(null);

      const result = await service.getCurrentRate();

      expect(result).toBeNull();
    });
  });

  describe('getRateByDate', () => {
    it('should return exchange rate for specific date', async () => {
      const date = new Date('2024-01-15');
      mockExchangeRateRepository.findOne.mockResolvedValue(mockExchangeRate);

      const result = await service.getRateByDate(date);

      expect(result).toEqual(mockExchangeRate);
      expect(mockExchangeRateRepository.findOne).toHaveBeenCalledWith({
        where: { date: expect.any(Date) },
        relations: ['created_by'],
      });
    });

    it('should return null when no rate exists for date', async () => {
      const date = new Date('2024-01-15');
      mockExchangeRateRepository.findOne.mockResolvedValue(null);

      const result = await service.getRateByDate(date);

      expect(result).toBeNull();
    });

    it('should handle string date input', async () => {
      const dateString = '2024-01-15';
      mockExchangeRateRepository.findOne.mockResolvedValue(mockExchangeRate);

      const result = await service.getRateByDate(dateString);

      expect(result).toEqual(mockExchangeRate);
    });
  });

  describe('getRateByDateOrCurrent', () => {
    it('should return rate for specific date if exists', async () => {
      const date = new Date('2024-01-15');
      mockExchangeRateRepository.findOne.mockResolvedValue(mockExchangeRate);

      const result = await service.getRateByDateOrCurrent(date);

      expect(result).toEqual(mockExchangeRate);
      expect(mockExchangeRateRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should return current rate if date not found', async () => {
      const date = new Date('2024-01-15');
      mockExchangeRateRepository.findOne
        .mockResolvedValueOnce(null) // First call for date
        .mockResolvedValueOnce(mockExchangeRate); // Second call for current

      const result = await service.getRateByDateOrCurrent(date);

      expect(result).toEqual(mockExchangeRate);
      expect(mockExchangeRateRepository.findOne).toHaveBeenCalledTimes(2);
    });

    it('should return current rate if no date provided', async () => {
      mockExchangeRateRepository.findOne.mockResolvedValue(mockExchangeRate);

      const result = await service.getRateByDateOrCurrent();

      expect(result).toEqual(mockExchangeRate);
      expect(mockExchangeRateRepository.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should return all exchange rates ordered by date DESC', async () => {
      const rates = [mockExchangeRate, { ...mockExchangeRate, id: 'rate-2' }];
      mockExchangeRateRepository.find.mockResolvedValue(rates);

      const result = await service.findAll();

      expect(result).toEqual(rates);
      expect(mockExchangeRateRepository.find).toHaveBeenCalledWith({
        order: { date: 'DESC' },
        relations: ['created_by'],
      });
    });
  });

  describe('findOne', () => {
    it('should return exchange rate by ID', async () => {
      mockExchangeRateRepository.findOne.mockResolvedValue(mockExchangeRate);

      const result = await service.findOne('exchange-rate-id');

      expect(result).toEqual(mockExchangeRate);
      expect(mockExchangeRateRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'exchange-rate-id' },
        relations: ['created_by'],
      });
    });

    it('should throw NotFoundException when exchange rate not found', async () => {
      mockExchangeRateRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update exchange rate when user is Administration', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const updateDto: UpdateExchangeRateDto = {
        rate_usd_to_ars: 900,
      };

      mockExchangeRateRepository.findOne
        .mockResolvedValueOnce(mockExchangeRate) // findOne for ID
        .mockResolvedValueOnce(null); // findOne for date conflict check
      mockExchangeRateRepository.save.mockResolvedValue({
        ...mockExchangeRate,
        ...updateDto,
      });

      const result = await service.update('exchange-rate-id', updateDto, user);

      expect(result.rate_usd_to_ars).toBe(updateDto.rate_usd_to_ars);
      expect(mockExchangeRateRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not Administration', async () => {
      const user = createMockUser({ role: { name: UserRole.OPERATOR } });
      const updateDto: UpdateExchangeRateDto = {
        rate_usd_to_ars: 900,
      };

      mockExchangeRateRepository.findOne.mockResolvedValue(mockExchangeRate);

      await expect(
        service.update('exchange-rate-id', updateDto, user),
      ).rejects.toThrow(ForbiddenException);
      expect(mockExchangeRateRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when updating date to existing date', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const updateDto: UpdateExchangeRateDto = {
        date: '2024-01-20',
      };
      const existingRate = { ...mockExchangeRate, id: 'other-id' };

      // this.findOne calls findOne with relations, then update calls findOne again for date check
      // Need to mock both calls: first for this.findOne (with relations), second for date conflict check
      // Clear any previous mocks
      mockExchangeRateRepository.findOne.mockReset();
      mockExchangeRateRepository.findOne
        .mockResolvedValueOnce(mockExchangeRate) // First call: this.findOne(id) - needs relations (includes created_by)
        .mockResolvedValueOnce(existingRate); // Second call: findOne for date conflict check in update method

      await expect(
        service.update('exchange-rate-id', updateDto, user),
      ).rejects.toThrow(ConflictException);
      expect(mockExchangeRateRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete exchange rate when user is Administration', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });

      // this.findOne calls findOne with relations, so we need to mock it correctly
      mockExchangeRateRepository.findOne.mockResolvedValue(mockExchangeRate);
      mockExchangeRateRepository.remove.mockResolvedValue(mockExchangeRate);

      await service.remove('exchange-rate-id', user);

      expect(mockExchangeRateRepository.findOne).toHaveBeenCalled();
      // remove is called with the rate returned by this.findOne (which includes created_by)
      expect(mockExchangeRateRepository.remove).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockExchangeRate.id,
          created_by: expect.anything(),
        }),
      );
    });

    it('should throw ForbiddenException when user is not Administration', async () => {
      const user = createMockUser({ role: { name: UserRole.OPERATOR } });

      mockExchangeRateRepository.findOne.mockResolvedValue(mockExchangeRate);

      await expect(service.remove('exchange-rate-id', user)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockExchangeRateRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when exchange rate not found', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });

      // this.findOne calls findOne with relations, so we need to mock it correctly
      // When findOne returns null, this.findOne throws NotFoundException
      // Clear any previous mocks
      mockExchangeRateRepository.findOne.mockReset();
      mockExchangeRateRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id', user)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockExchangeRateRepository.remove).not.toHaveBeenCalled();
    });
  });
});

