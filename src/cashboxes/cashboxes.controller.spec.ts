import { Test, TestingModule } from '@nestjs/testing';
import { CashboxesController } from './cashboxes.controller';
import { CashboxesService } from './cashboxes.service';
import { CreateCashboxDto } from './dto/create-cashbox.dto';
import { CloseCashboxDto } from './dto/close-cashbox.dto';
import { ApproveDifferenceDto } from './dto/approve-difference.dto';
import { createMockUser } from '../common/test/test-helpers';

describe('CashboxesController', () => {
  let controller: CashboxesController;
  let cashboxesService: CashboxesService;

  const mockCashboxesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    close: jest.fn(),
    approveDifference: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashboxesController],
      providers: [
        {
          provide: CashboxesService,
          useValue: mockCashboxesService,
        },
      ],
    }).compile();

    controller = module.get<CashboxesController>(CashboxesController);
    cashboxesService = module.get<CashboxesService>(CashboxesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create cashbox successfully', async () => {
      const user = createMockUser();
      const createDto: CreateCashboxDto = {
        user_id: user.id,
        opening_balance_ars: 10000,
        opening_date: '2024-01-15',
      };

      const expectedResult = {
        id: 'cashbox-id',
        ...createDto,
      };

      mockCashboxesService.create.mockResolvedValue(expectedResult);

      const req = { user };
      const result = await controller.create(createDto, req);

      expect(result).toEqual(expectedResult);
      expect(cashboxesService.create).toHaveBeenCalledWith(createDto, user);
    });
  });

  describe('close', () => {
    it('should close cashbox successfully', async () => {
      const user = createMockUser();
      const closeDto: CloseCashboxDto = {
        closing_balance_ars: 9500,
        closing_balance_usd: 95,
      };

      const closedCashbox = {
        id: 'cashbox-id',
        status: 'closed',
        ...closeDto,
      };

      mockCashboxesService.close.mockResolvedValue(closedCashbox);

      const req = { user };
      const result = await controller.close('cashbox-id', closeDto, req);

      expect(result).toEqual(closedCashbox);
      expect(cashboxesService.close).toHaveBeenCalledWith('cashbox-id', closeDto, user);
    });
  });

  describe('approveDifference', () => {
    it('should approve difference successfully', async () => {
      const user = createMockUser();
      const approveDto: ApproveDifferenceDto = {};

      const approvedCashbox = {
        id: 'cashbox-id',
        difference_approved: true,
      };

      mockCashboxesService.approveDifference.mockResolvedValue(approvedCashbox);

      const req = { user };
      const result = await controller.approveDifference('cashbox-id', approveDto, req);

      expect(result).toEqual(approvedCashbox);
      expect(cashboxesService.approveDifference).toHaveBeenCalledWith(
        'cashbox-id',
        approveDto,
        user,
      );
    });
  });
});

