import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { Supplier } from './suppliers.entity';
import { SupplierDocument } from '../supplier-documents/supplier-documents.entity';
import { AlertsService } from '../alerts/alerts.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { SupplierStatus, UserRole, SupplierDocumentType, AlertType, AlertSeverity } from '../common/enums';
import { createMockUser } from '../common/test/test-helpers';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let supplierRepository: Repository<Supplier>;
  let supplierDocumentRepository: Repository<SupplierDocument>;
  let alertsService: AlertsService;

  const mockSupplierRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockSupplierDocumentRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockAlertsService = {
    createAlert: jest.fn(),
  };

  const mockSupplier: Supplier = {
    id: 'supplier-id',
    name: 'Test Supplier',
    cuit: '20-12345678-9',
    email: 'supplier@example.com',
    status: SupplierStatus.PROVISIONAL,
    created_at: new Date(),
    updated_at: new Date(),
    documents: [],
    contracts: [],
    expenses: [],
  } as Supplier;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockSupplierRepository,
        },
        {
          provide: getRepositoryToken(SupplierDocument),
          useValue: mockSupplierDocumentRepository,
        },
        {
          provide: AlertsService,
          useValue: mockAlertsService,
        },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    supplierRepository = module.get<Repository<Supplier>>(getRepositoryToken(Supplier));
    supplierDocumentRepository = module.get<Repository<SupplierDocument>>(
      getRepositoryToken(SupplierDocument),
    );
    alertsService = module.get<AlertsService>(AlertsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create provisional supplier when operator creates', async () => {
      const user = createMockUser({ role: { name: UserRole.OPERATOR } });
      const createDto: CreateSupplierDto = {
        name: 'New Supplier',
        cuit: '20-12345678-9',
      };

      mockSupplierRepository.create.mockReturnValue({
        ...createDto,
        id: 'supplier-id',
        status: SupplierStatus.PROVISIONAL,
        created_by_id: user.id,
      });
      mockSupplierRepository.save.mockResolvedValue({
        id: 'supplier-id',
        ...createDto,
        status: SupplierStatus.PROVISIONAL,
      });

      const result = await service.create(createDto, user);

      expect(result.status).toBe(SupplierStatus.PROVISIONAL);
      expect(mockAlertsService.createAlert).toHaveBeenCalled();
    });

    it('should allow admin to create with any status', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const createDto: CreateSupplierDto = {
        name: 'New Supplier',
        status: SupplierStatus.APPROVED,
      };

      mockSupplierRepository.create.mockReturnValue({
        ...createDto,
        id: 'supplier-id',
      });
      mockSupplierRepository.save.mockResolvedValue({
        id: 'supplier-id',
        ...createDto,
      });

      const result = await service.create(createDto, user);

      expect(result.status).toBe(SupplierStatus.APPROVED);
    });
  });

  describe('approve', () => {
    it('should approve provisional supplier successfully', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const provisionalSupplier = {
        ...mockSupplier,
        status: SupplierStatus.PROVISIONAL,
      };

      mockSupplierRepository.findOne.mockResolvedValue(provisionalSupplier);
      mockSupplierRepository.save.mockResolvedValue({
        ...provisionalSupplier,
        status: SupplierStatus.APPROVED,
      });

      const result = await service.approve('supplier-id', user);

      expect(result.status).toBe(SupplierStatus.APPROVED);
    });

    it('should throw ForbiddenException when non-admin tries to approve', async () => {
      const user = createMockUser({ role: { name: UserRole.OPERATOR } });

      await expect(service.approve('supplier-id', user)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when trying to approve non-provisional supplier', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const approvedSupplier = {
        ...mockSupplier,
        status: SupplierStatus.APPROVED,
      };

      mockSupplierRepository.findOne.mockResolvedValue(approvedSupplier);

      await expect(service.approve('supplier-id', user)).rejects.toThrow(BadRequestException);
      await expect(service.approve('supplier-id', user)).rejects.toThrow(
        'Only provisional suppliers can be approved',
      );
    });
  });

  describe('reject', () => {
    it('should reject provisional supplier successfully', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const operatorId = 'operator-id';
      const provisionalSupplier = {
        ...mockSupplier,
        status: SupplierStatus.PROVISIONAL,
        created_by_id: operatorId,
      };

      mockSupplierRepository.findOne.mockResolvedValue(provisionalSupplier);
      mockSupplierRepository.save.mockResolvedValue({
        ...provisionalSupplier,
        status: SupplierStatus.REJECTED,
      });

      const result = await service.reject('supplier-id', user);

      expect(result.status).toBe(SupplierStatus.REJECTED);
      expect(mockAlertsService.createAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AlertType.MISSING_VALIDATION,
          severity: AlertSeverity.WARNING,
          supplier_id: 'supplier-id',
          user_id: operatorId, // Alert should be sent to the operator who created the supplier
        }),
      );
    });

    it('should throw ForbiddenException when non-admin tries to reject', async () => {
      const user = createMockUser({ role: { name: UserRole.OPERATOR } });

      await expect(service.reject('supplier-id', user)).rejects.toThrow(ForbiddenException);
      await expect(service.reject('supplier-id', user)).rejects.toThrow(
        'Solo Administración y Dirección pueden rechazar proveedores',
      );
    });

    it('should throw BadRequestException when trying to reject non-provisional supplier', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const approvedSupplier = {
        ...mockSupplier,
        status: SupplierStatus.APPROVED,
      };

      mockSupplierRepository.findOne.mockResolvedValue(approvedSupplier);

      await expect(service.reject('supplier-id', user)).rejects.toThrow(BadRequestException);
      await expect(service.reject('supplier-id', user)).rejects.toThrow(
        'Only provisional suppliers can be rejected',
      );
    });
  });

  describe('checkDocumentExpiration', () => {
    it('should block supplier when ART expires', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      const supplier = {
        ...mockSupplier,
        status: SupplierStatus.APPROVED,
        documents: [],
      };

      const expiredDoc = {
        id: 'doc-id',
        supplier_id: 'supplier-id',
        document_type: SupplierDocumentType.ART,
        expiration_date: expiredDate,
        is_valid: true,
      };

      mockSupplierRepository.findOne.mockResolvedValue(supplier);
      mockSupplierDocumentRepository.findOne.mockResolvedValue(expiredDoc);
      mockSupplierRepository.save.mockResolvedValue({
        ...supplier,
        status: SupplierStatus.BLOCKED,
      });
      mockSupplierDocumentRepository.save.mockResolvedValue({
        ...expiredDoc,
        is_valid: false,
      });

      const result = await service.checkDocumentExpiration('supplier-id');

      expect(result).toBe(true);
      expect(mockSupplierRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SupplierStatus.BLOCKED,
        }),
      );
      expect(mockAlertsService.createAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AlertType.EXPIRED_DOCUMENTATION,
          severity: AlertSeverity.CRITICAL,
        }),
      );
    });

    it('should not block supplier when ART is not expired', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const supplier = {
        ...mockSupplier,
        status: SupplierStatus.APPROVED,
        documents: [],
      };

      const validDoc = {
        id: 'doc-id',
        supplier_id: 'supplier-id',
        document_type: SupplierDocumentType.ART,
        expiration_date: futureDate,
        is_valid: true,
      };

      mockSupplierRepository.findOne.mockResolvedValue(supplier);
      mockSupplierDocumentRepository.findOne.mockResolvedValue(validDoc);

      const result = await service.checkDocumentExpiration('supplier-id');

      expect(result).toBe(false);
      expect(mockSupplierRepository.save).not.toHaveBeenCalled();
      expect(mockAlertsService.createAlert).not.toHaveBeenCalled();
    });

    it('should not block supplier if already blocked', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      const blockedSupplier = {
        ...mockSupplier,
        status: SupplierStatus.BLOCKED,
        documents: [],
      };

      const expiredDoc = {
        id: 'doc-id',
        supplier_id: 'supplier-id',
        document_type: SupplierDocumentType.ART,
        expiration_date: expiredDate,
        is_valid: true,
      };

      mockSupplierRepository.findOne.mockResolvedValue(blockedSupplier);
      mockSupplierDocumentRepository.findOne.mockResolvedValue(expiredDoc);

      const result = await service.checkDocumentExpiration('supplier-id');

      expect(result).toBe(false);
      expect(mockSupplierRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('checkAndBlockExpiredDocuments', () => {
    it('should block supplier when ART expires', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      const expiredDoc = {
        id: 'doc-id',
        supplier_id: 'supplier-id',
        document_type: SupplierDocumentType.ART,
        expiration_date: expiredDate,
        is_valid: true,
        supplier: mockSupplier,
      };

      mockSupplierDocumentRepository.find.mockResolvedValue([expiredDoc]);
      mockSupplierRepository.save.mockResolvedValue({
        ...mockSupplier,
        status: SupplierStatus.BLOCKED,
      });
      mockSupplierDocumentRepository.save.mockResolvedValue({
        ...expiredDoc,
        is_valid: false,
      });

      await service.checkAndBlockExpiredDocuments();

      expect(mockSupplierRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SupplierStatus.BLOCKED,
        }),
      );
      expect(mockAlertsService.createAlert).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException when operator tries to change status', async () => {
      const user = createMockUser({ role: { name: UserRole.OPERATOR } });
      const updateDto = {
        status: SupplierStatus.APPROVED,
      };

      mockSupplierRepository.findOne.mockResolvedValue(mockSupplier);

      await expect(service.update('supplier-id', updateDto, user)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update('supplier-id', updateDto, user)).rejects.toThrow(
        'Los operadores no pueden cambiar el estado de los proveedores',
      );
    });

    it('should throw ForbiddenException when non-Direction tries to unblock supplier', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const blockedSupplier = {
        ...mockSupplier,
        status: SupplierStatus.BLOCKED,
      };
      const updateDto = {
        status: SupplierStatus.APPROVED,
      };

      const validDoc = {
        supplier_id: 'supplier-id',
        document_type: SupplierDocumentType.ART,
        expiration_date: new Date('2030-01-01'),
      };

      mockSupplierRepository.findOne.mockResolvedValue(blockedSupplier);
      mockSupplierDocumentRepository.findOne.mockResolvedValue(validDoc);

      await expect(service.update('supplier-id', updateDto, user)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update('supplier-id', updateDto, user)).rejects.toThrow(
        'Solo Dirección puede desbloquear proveedores',
      );
    });

    it('should allow Direction to unblock supplier with valid ART', async () => {
      const user = createMockUser({ role: { name: UserRole.DIRECTION } });
      const blockedSupplier = {
        ...mockSupplier,
        status: SupplierStatus.BLOCKED,
      };
      const updateDto = {
        status: SupplierStatus.APPROVED,
      };

      const validDoc = {
        supplier_id: 'supplier-id',
        document_type: SupplierDocumentType.ART,
        expiration_date: new Date('2030-01-01'),
      };

      mockSupplierRepository.findOne.mockResolvedValue(blockedSupplier);
      mockSupplierDocumentRepository.findOne.mockResolvedValue(validDoc);
      mockSupplierRepository.save.mockResolvedValue({
        ...blockedSupplier,
        status: SupplierStatus.APPROVED,
      });
      mockSupplierDocumentRepository.findOne.mockResolvedValue(null); // For checkDocumentExpiration

      const result = await service.update('supplier-id', updateDto, user);

      expect(result.status).toBe(SupplierStatus.APPROVED);
    });

    it('should throw BadRequestException when trying to approve supplier with expired ART', async () => {
      const user = createMockUser({ role: { name: UserRole.DIRECTION } });
      const blockedSupplier = {
        ...mockSupplier,
        status: SupplierStatus.BLOCKED,
      };
      const updateDto = {
        status: SupplierStatus.APPROVED,
      };

      const expiredDoc = {
        supplier_id: 'supplier-id',
        document_type: SupplierDocumentType.ART,
        expiration_date: new Date('2020-01-01'),
      };

      mockSupplierRepository.findOne.mockResolvedValue(blockedSupplier);
      mockSupplierDocumentRepository.findOne.mockResolvedValue(expiredDoc);

      await expect(service.update('supplier-id', updateDto, user)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('supplier-id', updateDto, user)).rejects.toThrow(
        'Cannot approve supplier with expired ART',
      );
    });
  });
});

