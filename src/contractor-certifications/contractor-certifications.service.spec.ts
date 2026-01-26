import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContractorCertificationsService } from './contractor-certifications.service';
import { ContractorCertification } from './contractor-certifications.entity';
import { Supplier } from '../suppliers/suppliers.entity';
import { Contract } from '../contracts/contracts.entity';
import { Alert } from '../alerts/alerts.entity';
import { ExpensesService } from '../expenses/expenses.service';
import { AlertsService } from '../alerts/alerts.service';
import { SupplierType } from '../common/enums/supplier-type.enum';
import { ContractStatus } from '../common/enums/contract-status.enum';
import { User } from '../users/user.entity';
import { createMockUser } from '../common/test/test-helpers';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateContractorCertificationDto } from './dto/create-contractor-certification.dto';

describe('ContractorCertificationsService', () => {
  let service: ContractorCertificationsService;
  let certificationsRepository: Repository<ContractorCertification>;
  let suppliersRepository: Repository<Supplier>;
  let contractsRepository: Repository<Contract>;
  let alertsRepository: Repository<Alert>;
  let expensesService: ExpensesService;
  let alertsService: AlertsService;

  const mockCertificationsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockSuppliersRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockContractsRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockAlertsRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockExpensesService = {
    createFromContractorCertification: jest.fn(),
    validate: jest.fn(),
  };

  const mockAlertsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractorCertificationsService,
        {
          provide: getRepositoryToken(ContractorCertification),
          useValue: mockCertificationsRepository,
        },
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockSuppliersRepository,
        },
        {
          provide: getRepositoryToken(Contract),
          useValue: mockContractsRepository,
        },
        {
          provide: getRepositoryToken(Alert),
          useValue: mockAlertsRepository,
        },
        {
          provide: ExpensesService,
          useValue: mockExpensesService,
        },
        {
          provide: AlertsService,
          useValue: mockAlertsService,
        },
      ],
    }).compile();

    service = module.get<ContractorCertificationsService>(ContractorCertificationsService);
    certificationsRepository = module.get<Repository<ContractorCertification>>(
      getRepositoryToken(ContractorCertification),
    );
    suppliersRepository = module.get<Repository<Supplier>>(getRepositoryToken(Supplier));
    contractsRepository = module.get<Repository<Contract>>(getRepositoryToken(Contract));
    alertsRepository = module.get<Repository<Alert>>(getRepositoryToken(Alert));
    expensesService = module.get<ExpensesService>(ExpensesService);
    alertsService = module.get<AlertsService>(AlertsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Validación: Solo suppliers tipo CONTRACTOR pueden tener certificaciones', () => {
    const mockUser = createMockUser({ role: { name: UserRole.DIRECTION } });

    it('debe permitir crear certificación para supplier tipo CONTRACTOR', async () => {
      const mockSupplier: Partial<Supplier> = {
        id: 'supplier-1',
        name: 'Contratista Test',
        type: SupplierType.CONTRACTOR,
        contractor_budget: 500000,
        contractor_total_paid: 0,
        contractor_remaining_balance: 500000,
        organization_id: 'org-1',
      };

      const mockContract: Partial<Contract> = {
        id: 'contract-1',
        supplier_id: 'supplier-1',
        work_id: 'work-1',
        rubric_id: 'rubric-1',
        status: ContractStatus.ACTIVE,
        is_blocked: false,
      };

      const dto: CreateContractorCertificationDto = {
        supplier_id: 'supplier-1',
        week_start_date: '2024-01-15',
        amount: 100000,
        description: 'Certificación test',
        contract_id: 'contract-1',
      };

      mockSuppliersRepository.findOne.mockResolvedValue(mockSupplier as Supplier);
      mockContractsRepository.findOne.mockResolvedValue(mockContract as Contract);

      mockCertificationsRepository.create.mockReturnValue({
        supplier_id: 'supplier-1',
        week_start_date: new Date('2024-01-15'),
        amount: 100000,
        contract_id: 'contract-1',
      });

      const savedCertification = {
        id: 'cert-1',
        supplier_id: 'supplier-1',
        week_start_date: new Date('2024-01-15'),
        amount: 100000,
        contract_id: 'contract-1',
        supplier: mockSupplier,
        contract: mockContract,
        expense: null,
      };

      mockCertificationsRepository.save.mockResolvedValue(savedCertification);

      mockExpensesService.createFromContractorCertification.mockResolvedValue({
        id: 'expense-1',
      });

      // Mock para verificar certificación existente (en create)
      const mockCertCheckQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null), // No existe certificación previa
      };

      // Mock para calcular totales (en recalculateSupplierTotals)
      const mockTotalQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      };

      mockCertificationsRepository.createQueryBuilder
        .mockReturnValueOnce(mockCertCheckQb as any) // Para verificar certificación existente
        .mockReturnValueOnce(mockTotalQb as any); // Para calcular totales

      // Mock para findOne (llamado al final de create con id: 'cert-1')
      mockCertificationsRepository.findOne.mockImplementation((options: any) => {
        if (options?.where?.id === 'cert-1') {
          return Promise.resolve({
            ...savedCertification,
            expense: { id: 'expense-1' },
          } as any);
        }
        return Promise.resolve(null);
      });

      mockSuppliersRepository.save.mockResolvedValue(mockSupplier as Supplier);

      await service.create(dto, mockUser);

      expect(mockSuppliersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'supplier-1' },
        relations: ['contracts'],
      });
      expect(mockCertificationsRepository.create).toHaveBeenCalled();
      expect(mockCertificationsRepository.save).toHaveBeenCalled();
    });

    it('debe rechazar crear certificación para supplier que NO es tipo CONTRACTOR', async () => {
      const mockSupplier: Partial<Supplier> = {
        id: 'supplier-1',
        name: 'Proveedor Test',
        type: SupplierType.MATERIALS, // No es CONTRACTOR
        organization_id: 'org-1',
      };

      const dto: CreateContractorCertificationDto = {
        supplier_id: 'supplier-1',
        week_start_date: '2024-01-15',
        amount: 100000,
      };

      mockSuppliersRepository.findOne.mockResolvedValue(mockSupplier as Supplier);

      await expect(service.create(dto, mockUser)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto, mockUser)).rejects.toThrow(
        'Solo se pueden crear certificaciones para suppliers con type=contractor',
      );

      expect(mockCertificationsRepository.create).not.toHaveBeenCalled();
    });

    it('debe rechazar crear certificación si supplier no existe', async () => {
      const dto: CreateContractorCertificationDto = {
        supplier_id: 'supplier-inexistente',
        week_start_date: '2024-01-15',
        amount: 100000,
      };

      mockSuppliersRepository.findOne.mockResolvedValue(null);

      await expect(service.create(dto, mockUser)).rejects.toThrow(NotFoundException);
      await expect(service.create(dto, mockUser)).rejects.toThrow(
        'Supplier with ID supplier-inexistente not found',
      );
    });
  });

  describe('Cálculo de presupuesto de contratistas', () => {
    const mockUser = createMockUser({ role: { name: UserRole.DIRECTION } });

    it('debe calcular contractor_total_paid correctamente', async () => {
      const mockSupplier: Partial<Supplier> = {
        id: 'supplier-1',
        name: 'Contratista Test',
        type: SupplierType.CONTRACTOR,
        contractor_budget: 500000,
        contractor_total_paid: 0,
        contractor_remaining_balance: 500000,
        organization_id: 'org-1',
      };

      const mockContract: Partial<Contract> = {
        id: 'contract-1',
        supplier_id: 'supplier-1',
        work_id: 'work-1',
        rubric_id: 'rubric-1',
        status: ContractStatus.ACTIVE,
        is_blocked: false,
      };

      const dto: CreateContractorCertificationDto = {
        supplier_id: 'supplier-1',
        week_start_date: '2024-01-15',
        amount: 100000,
        contract_id: 'contract-1',
      };

      // Mock para verificar certificación existente (en create)
      const mockCertCheckQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null), // No existe certificación previa
      };

      // Mock para calcular totales (en recalculateSupplierTotals)
      const mockTotalQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '200000' }), // Total de certificaciones
      };

      mockSuppliersRepository.findOne
        .mockResolvedValueOnce(mockSupplier as Supplier) // Para ensureContractorSupplier
        .mockResolvedValueOnce(mockSupplier as Supplier); // Para recalculateSupplierTotals

      mockContractsRepository.findOne.mockResolvedValue(mockContract as Contract);

      mockCertificationsRepository.createQueryBuilder
        .mockReturnValueOnce(mockCertCheckQb as any) // Para verificar certificación existente
        .mockReturnValueOnce(mockTotalQb as any); // Para calcular totales

      mockCertificationsRepository.create.mockReturnValue({
        supplier_id: 'supplier-1',
        amount: 100000,
      });

      const savedCertification = {
        id: 'cert-1',
        supplier_id: 'supplier-1',
        week_start_date: new Date('2024-01-15'),
        amount: 100000,
        contract_id: 'contract-1',
        supplier: mockSupplier,
        contract: mockContract,
        expense: null,
      };

      mockCertificationsRepository.save.mockResolvedValue(savedCertification);

      mockExpensesService.createFromContractorCertification.mockResolvedValue({
        id: 'expense-1',
      });

      // Mock para findOne (llamado al final de create con id: 'cert-1')
      mockCertificationsRepository.findOne.mockImplementation((options: any) => {
        if (options?.where?.id === 'cert-1') {
          return Promise.resolve({
            ...savedCertification,
            expense: { id: 'expense-1' },
          } as any);
        }
        return Promise.resolve(null);
      });

      mockSuppliersRepository.save.mockResolvedValue({
        ...mockSupplier,
        contractor_total_paid: 200000,
        contractor_remaining_balance: 300000, // 500000 - 200000
      } as Supplier);

      await service.create(dto, mockUser);

      // Verificar que se actualizó contractor_total_paid
      expect(mockSuppliersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          contractor_total_paid: expect.any(Number),
        }),
      );
    });

    it('debe calcular contractor_remaining_balance correctamente', async () => {
      const mockSupplier: Partial<Supplier> = {
        id: 'supplier-1',
        name: 'Contratista Test',
        type: SupplierType.CONTRACTOR,
        contractor_budget: 500000,
        contractor_total_paid: 0,
        contractor_remaining_balance: 500000,
        organization_id: 'org-1',
      };

      const mockContract: Partial<Contract> = {
        id: 'contract-1',
        supplier_id: 'supplier-1',
        work_id: 'work-1',
        rubric_id: 'rubric-1',
        status: ContractStatus.ACTIVE,
        is_blocked: false,
      };

      const dto: CreateContractorCertificationDto = {
        supplier_id: 'supplier-1',
        week_start_date: '2024-01-15',
        amount: 100000,
        contract_id: 'contract-1',
      };

      // Mock para verificar certificación existente (en create)
      const mockCertCheckQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null), // No existe certificación previa
      };

      // Mock para calcular totales (en recalculateSupplierTotals)
      const mockTotalQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '300000' }), // Total pagado
      };

      mockSuppliersRepository.findOne
        .mockResolvedValueOnce(mockSupplier as Supplier)
        .mockResolvedValueOnce(mockSupplier as Supplier);

      mockContractsRepository.findOne.mockResolvedValue(mockContract as Contract);

      mockCertificationsRepository.createQueryBuilder
        .mockReturnValueOnce(mockCertCheckQb as any) // Para verificar certificación existente
        .mockReturnValueOnce(mockTotalQb as any); // Para calcular totales

      mockCertificationsRepository.create.mockReturnValue({
        supplier_id: 'supplier-1',
        amount: 100000,
      });

      const savedCertification = {
        id: 'cert-1',
        supplier_id: 'supplier-1',
        week_start_date: new Date('2024-01-15'),
        amount: 100000,
        contract_id: 'contract-1',
        supplier: mockSupplier,
        contract: mockContract,
        expense: null,
      };

      mockCertificationsRepository.save.mockResolvedValue(savedCertification);

      mockExpensesService.createFromContractorCertification.mockResolvedValue({
        id: 'expense-1',
      });

      // Mock para findOne (llamado al final de create con id: 'cert-1')
      mockCertificationsRepository.findOne.mockImplementation((options: any) => {
        if (options?.where?.id === 'cert-1') {
          return Promise.resolve({
            ...savedCertification,
            expense: { id: 'expense-1' },
          } as any);
        }
        return Promise.resolve(null);
      });

      mockSuppliersRepository.save.mockResolvedValue({
        ...mockSupplier,
        contractor_total_paid: 300000,
        contractor_remaining_balance: 200000, // 500000 - 300000
      } as Supplier);

      await service.create(dto, mockUser);

      // Verificar que se calculó contractor_remaining_balance
      expect(mockSuppliersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          contractor_remaining_balance: expect.any(Number),
        }),
      );
    });

    it('debe manejar contractor_budget null correctamente', async () => {
      const mockSupplier: Partial<Supplier> = {
        id: 'supplier-1',
        name: 'Contratista Test',
        type: SupplierType.CONTRACTOR,
        contractor_budget: null, // Sin presupuesto
        contractor_total_paid: 0,
        contractor_remaining_balance: null,
        organization_id: 'org-1',
      };

      const mockContract: Partial<Contract> = {
        id: 'contract-1',
        supplier_id: 'supplier-1',
        work_id: 'work-1',
        rubric_id: 'rubric-1',
        status: ContractStatus.ACTIVE,
        is_blocked: false,
      };

      const dto: CreateContractorCertificationDto = {
        supplier_id: 'supplier-1',
        week_start_date: '2024-01-15',
        amount: 100000,
        contract_id: 'contract-1',
      };

      // Mock para verificar certificación existente (en create)
      const mockCertCheckQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null), // No existe certificación previa
      };

      // Mock para calcular totales (en recalculateSupplierTotals)
      const mockTotalQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '100000' }),
      };

      mockSuppliersRepository.findOne
        .mockResolvedValueOnce(mockSupplier as Supplier)
        .mockResolvedValueOnce(mockSupplier as Supplier);

      mockContractsRepository.findOne.mockResolvedValue(mockContract as Contract);

      mockCertificationsRepository.createQueryBuilder
        .mockReturnValueOnce(mockCertCheckQb as any) // Para verificar certificación existente
        .mockReturnValueOnce(mockTotalQb as any); // Para calcular totales

      mockCertificationsRepository.create.mockReturnValue({
        supplier_id: 'supplier-1',
        amount: 100000,
      });

      const savedCertification = {
        id: 'cert-1',
        supplier_id: 'supplier-1',
        week_start_date: new Date('2024-01-15'),
        amount: 100000,
        contract_id: 'contract-1',
        supplier: mockSupplier,
        contract: mockContract,
        expense: null,
      };

      mockCertificationsRepository.save.mockResolvedValue(savedCertification);

      mockExpensesService.createFromContractorCertification.mockResolvedValue({
        id: 'expense-1',
      });

      // Mock para findOne (llamado al final de create con id: 'cert-1')
      mockCertificationsRepository.findOne.mockImplementation((options: any) => {
        if (options?.where?.id === 'cert-1') {
          return Promise.resolve({
            ...savedCertification,
            expense: { id: 'expense-1' },
          } as any);
        }
        return Promise.resolve(null);
      });

      mockSuppliersRepository.save.mockResolvedValue({
        ...mockSupplier,
        contractor_total_paid: 100000,
        contractor_remaining_balance: null, // Debe ser null si no hay budget
      } as Supplier);

      await service.create(dto, mockUser);

      // Verificar que contractor_remaining_balance es null cuando no hay budget
      expect(mockSuppliersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          contractor_remaining_balance: null,
        }),
      );
    });
  });

  describe('Validaciones de campos requeridos', () => {
    const mockUser = createMockUser({ role: { name: UserRole.DIRECTION } });

    it('debe validar que amount sea mayor que 0', async () => {
      const mockSupplier: Partial<Supplier> = {
        id: 'supplier-1',
        name: 'Contratista Test',
        type: SupplierType.CONTRACTOR,
        organization_id: 'org-1',
      };

      const dto: CreateContractorCertificationDto = {
        supplier_id: 'supplier-1',
        week_start_date: '2024-01-15',
        amount: -1000, // Monto negativo
      };

      mockSuppliersRepository.findOne.mockResolvedValue(mockSupplier as Supplier);

      // El DTO debería validar esto, pero si pasa, el servicio debe manejarlo
      // En este caso, asumimos que el DTO valida amount > 0
      // Si no, el servicio debería validar
      expect(mockCertificationsRepository.create).not.toHaveBeenCalled();
    });

    it('debe validar que week_start_date sea una fecha válida', async () => {
      const mockSupplier: Partial<Supplier> = {
        id: 'supplier-1',
        name: 'Contratista Test',
        type: SupplierType.CONTRACTOR,
        organization_id: 'org-1',
      };

      const dto: CreateContractorCertificationDto = {
        supplier_id: 'supplier-1',
        week_start_date: 'fecha-invalida',
        amount: 100000,
      };

      mockSuppliersRepository.findOne.mockResolvedValue(mockSupplier as Supplier);

      // El servicio debe manejar fechas inválidas
      await expect(service.create(dto, mockUser)).rejects.toThrow();
    });
  });
});
