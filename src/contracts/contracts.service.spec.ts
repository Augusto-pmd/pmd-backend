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

    it('should throw BadRequestException when end_date is before or equal to start_date', async () => {
      const user = createMockUser();
      const createDto: CreateContractDto = {
        work_id: 'work-id',
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount_total: 100000,
        currency: Currency.ARS,
        start_date: '2024-12-31',
        end_date: '2024-12-30', // Before start_date
      };

      const approvedSupplier = {
        id: 'supplier-id',
        status: SupplierStatus.APPROVED,
      };

      mockSupplierRepository.findOne.mockResolvedValue(approvedSupplier);

      await expect(service.create(createDto, user)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto, user)).rejects.toThrow('end_date must be after start_date');
    });

    it('should throw BadRequestException when end_date equals start_date', async () => {
      const user = createMockUser();
      const createDto: CreateContractDto = {
        work_id: 'work-id',
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount_total: 100000,
        currency: Currency.ARS,
        start_date: '2024-12-31',
        end_date: '2024-12-31', // Equal to start_date
      };

      const approvedSupplier = {
        id: 'supplier-id',
        status: SupplierStatus.APPROVED,
      };

      mockSupplierRepository.findOne.mockResolvedValue(approvedSupplier);

      await expect(service.create(createDto, user)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto, user)).rejects.toThrow('end_date must be after start_date');
    });

    it('should throw BadRequestException when amount_executed exceeds amount_total', async () => {
      const user = createMockUser();
      const createDto: CreateContractDto = {
        work_id: 'work-id',
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount_total: 100000,
        amount_executed: 150000, // Exceeds amount_total
        currency: Currency.ARS,
      };

      const approvedSupplier = {
        id: 'supplier-id',
        status: SupplierStatus.APPROVED,
      };

      mockSupplierRepository.findOne.mockResolvedValue(approvedSupplier);

      await expect(service.create(createDto, user)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto, user)).rejects.toThrow('amount_executed cannot exceed amount_total');
    });

    it('should throw BadRequestException when amount_executed is negative', async () => {
      const user = createMockUser();
      const createDto: CreateContractDto = {
        work_id: 'work-id',
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount_total: 100000,
        amount_executed: -1000, // Negative
        currency: Currency.ARS,
      };

      const approvedSupplier = {
        id: 'supplier-id',
        status: SupplierStatus.APPROVED,
      };

      mockSupplierRepository.findOne.mockResolvedValue(approvedSupplier);

      await expect(service.create(createDto, user)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto, user)).rejects.toThrow('amount_executed must be greater than or equal to 0');
    });

    it('should create contract successfully with valid date range', async () => {
      const user = createMockUser();
      const createDto: CreateContractDto = {
        work_id: 'work-id',
        supplier_id: 'supplier-id',
        rubric_id: 'rubric-id',
        amount_total: 100000,
        currency: Currency.ARS,
        start_date: '2024-01-01',
        end_date: '2024-12-31', // After start_date
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

    it('should allow Direction to modify amount_total', async () => {
      const user = createMockUser({ role: { name: UserRole.DIRECTION } });
      const updateDto: UpdateContractDto = {
        amount_total: 150000,
      };

      mockContractRepository.findOne.mockResolvedValue(mockContract);
      mockContractRepository.save.mockResolvedValue({
        ...mockContract,
        amount_total: 150000,
      });

      const result = await service.update('contract-id', updateDto, user);

      expect(result.amount_total).toBe(150000);
    });

    it('should allow Direction to modify currency', async () => {
      const user = createMockUser({ role: { name: UserRole.DIRECTION } });
      const updateDto: UpdateContractDto = {
        currency: Currency.USD,
      };

      mockContractRepository.findOne.mockResolvedValue(mockContract);
      mockContractRepository.save.mockResolvedValue({
        ...mockContract,
        currency: Currency.USD,
      });

      const result = await service.update('contract-id', updateDto, user);

      expect(result.currency).toBe(Currency.USD);
    });

    it('should throw ForbiddenException when Administration tries to modify amount_total', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const updateDto: UpdateContractDto = {
        amount_total: 150000,
      };

      mockContractRepository.findOne.mockResolvedValue(mockContract);

      await expect(service.update('contract-id', updateDto, user)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update('contract-id', updateDto, user)).rejects.toThrow(
        'Only Direction can modify amount_total and currency fields',
      );
    });

    it('should throw ForbiddenException when Administration tries to modify currency', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const updateDto: UpdateContractDto = {
        currency: Currency.USD,
      };

      mockContractRepository.findOne.mockResolvedValue(mockContract);

      await expect(service.update('contract-id', updateDto, user)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update('contract-id', updateDto, user)).rejects.toThrow(
        'Only Direction can modify amount_total and currency fields',
      );
    });

    it('should allow Administration to modify payment_terms', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const updateDto: UpdateContractDto = {
        payment_terms: 'New payment terms',
      };

      mockContractRepository.findOne.mockResolvedValue(mockContract);
      mockContractRepository.save.mockResolvedValue({
        ...mockContract,
        payment_terms: 'New payment terms',
      });

      const result = await service.update('contract-id', updateDto, user);

      expect(result.payment_terms).toBe('New payment terms');
    });

    it('should allow Administration to modify file_url', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const updateDto: UpdateContractDto = {
        file_url: 'https://example.com/new-file.pdf',
      };

      mockContractRepository.findOne.mockResolvedValue(mockContract);
      mockContractRepository.save.mockResolvedValue({
        ...mockContract,
        file_url: 'https://example.com/new-file.pdf',
      });

      const result = await service.update('contract-id', updateDto, user);

      expect(result.file_url).toBe('https://example.com/new-file.pdf');
    });

    it('should allow Administration to modify start_date and end_date', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const updateDto: UpdateContractDto = {
        start_date: '2024-02-01',
        end_date: '2024-12-31',
      };

      mockContractRepository.findOne.mockResolvedValue(mockContract);
      mockContractRepository.save.mockResolvedValue({
        ...mockContract,
        start_date: new Date('2024-02-01'),
        end_date: new Date('2024-12-31'),
      });

      const result = await service.update('contract-id', updateDto, user);

      expect(result.start_date).toEqual(new Date('2024-02-01'));
      expect(result.end_date).toEqual(new Date('2024-12-31'));
    });
  });

  describe('updateAmountExecuted', () => {
    it('should update amount_executed and auto-block when saldo <= 0', async () => {
      const contract = {
        ...mockContract,
        amount_total: 100000,
        amount_executed: 50000,
        is_blocked: false,
      };

      mockContractRepository.findOne.mockResolvedValue(contract);
      mockContractRepository.save.mockResolvedValue({
        ...contract,
        amount_executed: 100000, // amount_executed = amount_total
        is_blocked: true,
      });

      const result = await service.updateAmountExecuted('contract-id', 100000);

      expect(result.is_blocked).toBe(true);
      expect(result.amount_executed).toBe(100000);
      expect(mockAlertsService.createAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.anything(), // CONTRACT_ZERO_BALANCE
          severity: expect.anything(), // WARNING
          contract_id: 'contract-id',
        }),
      );
    });

    it('should update amount_executed and NOT block when saldo > 0', async () => {
      const contract = {
        ...mockContract,
        amount_total: 100000,
        amount_executed: 50000,
        is_blocked: false,
      };

      mockContractRepository.findOne.mockResolvedValue(contract);
      mockContractRepository.save.mockResolvedValue({
        ...contract,
        amount_executed: 80000, // saldo = 20000 > 0
        is_blocked: false,
      });

      const result = await service.updateAmountExecuted('contract-id', 80000);

      expect(result.is_blocked).toBe(false);
      expect(result.amount_executed).toBe(80000);
      expect(mockAlertsService.createAlert).not.toHaveBeenCalled();
    });

    it('should NOT generate alert if contract was already blocked', async () => {
      const contract = {
        ...mockContract,
        amount_total: 100000,
        amount_executed: 100000,
        is_blocked: true, // Already blocked
      };

      mockContractRepository.findOne.mockResolvedValue(contract);
      mockContractRepository.save.mockResolvedValue({
        ...contract,
        amount_executed: 100000,
        is_blocked: true,
      });

      const result = await service.updateAmountExecuted('contract-id', 100000);

      expect(result.is_blocked).toBe(true);
      // Should not generate alert if already blocked
      expect(mockAlertsService.createAlert).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      mockContractRepository.findOne.mockResolvedValue(null);

      await expect(service.updateAmountExecuted('non-existent-id', 50000)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateAmountExecuted('non-existent-id', 50000)).rejects.toThrow(
        'Contract with ID non-existent-id not found',
      );
    });

    it('should auto-block when amount_executed > amount_total', async () => {
      const contract = {
        ...mockContract,
        amount_total: 100000,
        amount_executed: 50000,
        is_blocked: false,
      };

      mockContractRepository.findOne.mockResolvedValue(contract);
      mockContractRepository.save.mockResolvedValue({
        ...contract,
        amount_executed: 110000, // amount_executed > amount_total
        is_blocked: true,
      });

      const result = await service.updateAmountExecuted('contract-id', 110000);

      expect(result.is_blocked).toBe(true);
      expect(mockAlertsService.createAlert).toHaveBeenCalled();
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

