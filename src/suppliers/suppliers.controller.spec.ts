import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { createMockUser } from '../common/test/test-helpers';

describe('SuppliersController', () => {
  let controller: SuppliersController;
  let suppliersService: SuppliersService;

  const mockSuppliersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [
        {
          provide: SuppliersService,
          useValue: mockSuppliersService,
        },
      ],
    }).compile();

    controller = module.get<SuppliersController>(SuppliersController);
    suppliersService = module.get<SuppliersService>(SuppliersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('approve', () => {
    it('should approve supplier successfully', async () => {
      const user = createMockUser();
      const approvedSupplier = {
        id: 'supplier-id',
        status: 'approved',
      };

      mockSuppliersService.approve.mockResolvedValue(approvedSupplier);

      const req = { user };
      const result = await controller.approve('supplier-id', req);

      expect(result).toEqual(approvedSupplier);
      expect(suppliersService.approve).toHaveBeenCalledWith('supplier-id', user);
    });
  });

  describe('reject', () => {
    it('should reject supplier successfully', async () => {
      const user = createMockUser();
      const rejectedSupplier = {
        id: 'supplier-id',
        status: 'rejected',
      };

      mockSuppliersService.reject.mockResolvedValue(rejectedSupplier);

      const req = { user };
      const result = await controller.reject('supplier-id', req);

      expect(result).toEqual(rejectedSupplier);
      expect(suppliersService.reject).toHaveBeenCalledWith('supplier-id', user);
    });
  });
});

