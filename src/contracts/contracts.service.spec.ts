import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { Contract } from './contracts.entity';
import { Supplier } from '../suppliers/suppliers.entity';
import { AlertsService } from '../alerts/alerts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { Currency, UserRole, SupplierStatus } from '../common/enums';
import { createMockUser } from '../common/test/test-helpers';

describe('ContractsService', () => {
  let service: ContractsService;
  let contractRepository: Repository<Contract>;
  let supplierRepository: Repository<Supplier>;
  let alertsService: AlertsService;

  const mockContractRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
  };

  const mockSupplierRepository = {
    findOne: jest.fn(),
  };

  const mockAlertsService = {
    createAlert: jest.fn(),
  };

  const mockContract: Contract = {
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        {
          provide: getRepositoryToken(Contract),
          useValue: mockContractRepository,
        },
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockSupplierRepository,
        },
        {
          provide: AlertsService,
          useValue: mockAlertsService,
        },
      ],
    }).compile();

    service = module.get<ContractsService>(ContractsService);
    contractRepository = module.get<Repository<Contract>>(getRepositoryToken(Contract));
    supplierRepository = module.get<Repository<Supplier>>(getRepositoryToken(Supplier));
    alertsService = module.get<AlertsService>(AlertsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create contract successfully', async () => {
      const user = createMockUser();
      const createDto: CreateContractDto = {
        work_id: 'work-id',
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount_total: 100000,
        currency: Currency.ARS,
      };

      const approvedSupplier = {
        id: 'supplier-id',
        status: SupplierStatus.APPROVED,
      };

      mockSupplierRepository.findOne.mockResolvedValue(approvedSupplier);
      mockContractRepository.create.mockReturnValue({
        ...createDto,
        id: 'contract-id',
        amount_executed: 0,
        is_blocked: false,
      });
      mockContractRepository.save.mockResolvedValue({
        id: 'contract-id',
        ...createDto,
        amount_executed: 0,
        is_blocked: false,
      });

      const result = await service.create(createDto, user);

      expect(result).toBeDefined();
      expect(result.is_blocked).toBe(false);
    });

    it('should throw BadRequestException when supplier is blocked', async () => {
      const user = createMockUser();
      const createDto: CreateContractDto = {
        work_id: 'work-id',
        supplier_id: 'blocked-supplier-id',
        rubric_id: 'rubric-id',
        amount_total: 100000,
        currency: Currency.ARS,
      };

      const blockedSupplier = {
        id: 'blocked-supplier-id',
        status: SupplierStatus.BLOCKED,
      };

      mockSupplierRepository.findOne.mockResolvedValue(blockedSupplier);

      await expect(service.create(createDto, user)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto, user)).rejects.toThrow('blocked supplier');
    });
  });

  describe('update', () => {
    it('should auto-block contract when amount_executed reaches amount_total', async () => {
      const user = createMockUser();
      const updateDto: UpdateContractDto = {
        amount_executed: 100000,
      };

      mockContractRepository.findOne.mockResolvedValue(mockContract);
      mockContractRepository.save.mockResolvedValue({
        ...mockContract,
        amount_executed: 100000,
        is_blocked: true,
      });

      const result = await service.update('contract-id', updateDto, user);

      expect(result.is_blocked).toBe(true);
      expect(mockAlertsService.createAlert).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when non-direction tries to modify blocked contract', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const blockedContract = {
        ...mockContract,
        is_blocked: true,
      };
      const updateDto: UpdateContractDto = {
        amount_executed: 50000,
      };

      mockContractRepository.findOne.mockResolvedValue(blockedContract);

      await expect(service.update('contract-id', updateDto, user)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update('contract-id', updateDto, user)).rejects.toThrow(
        'Only Direction can override',
      );
    });

    it('should allow Direction to unblock contract', async () => {
      const user = createMockUser({ role: { name: UserRole.DIRECTION } });
      const blockedContract = {
        ...mockContract,
        is_blocked: true,
        amount_executed: 50000,
      };
      const updateDto: UpdateContractDto = {
        amount_executed: 50000,
        is_blocked: false,
      };

      mockContractRepository.findOne.mockResolvedValue(blockedContract);
      mockContractRepository.save.mockResolvedValue({
        ...blockedContract,
        is_blocked: false,
      });

      const result = await service.update('contract-id', updateDto, user);

      expect(result.is_blocked).toBe(false);
    });
  });

  describe('checkAndBlockZeroBalanceContracts', () => {
    it('should auto-block contracts with zero balance', async () => {
      const contractWithZeroBalance = {
        ...mockContract,
        amount_executed: 100000,
        is_blocked: false,
      };

      mockContractRepository.createQueryBuilder().getMany.mockResolvedValue([
        contractWithZeroBalance,
      ]);
      mockContractRepository.save.mockResolvedValue({
        ...contractWithZeroBalance,
        is_blocked: true,
      });

      await service.checkAndBlockZeroBalanceContracts();

      expect(mockContractRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          is_blocked: true,
        }),
      );
      expect(mockAlertsService.createAlert).toHaveBeenCalled();
    });
  });
});

