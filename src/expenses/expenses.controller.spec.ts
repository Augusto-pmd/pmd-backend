import { Test, TestingModule } from '@nestjs/testing';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ValidateExpenseDto } from './dto/validate-expense.dto';
import { createMockUser } from '../common/test/test-helpers';
import { Currency, DocumentType, ExpenseState } from '../common/enums';

describe('ExpensesController', () => {
  let controller: ExpensesController;
  let expensesService: ExpensesService;

  const mockExpensesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    validate: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpensesController],
      providers: [
        {
          provide: ExpensesService,
          useValue: mockExpensesService,
        },
      ],
    }).compile();

    controller = module.get<ExpensesController>(ExpensesController);
    expensesService = module.get<ExpensesService>(ExpensesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create expense successfully', async () => {
      const user = createMockUser();
      const createDto: CreateExpenseDto = {
        work_id: 'work-id',
        rubric_id: 'rubric-id',
        amount: 15000,
        currency: Currency.ARS,
        purchase_date: '2024-01-15',
        document_type: DocumentType.INVOICE_A,
      };

      const expectedResult = {
        id: 'expense-id',
        ...createDto,
        created_by_id: user.id,
      };

      mockExpensesService.create.mockResolvedValue(expectedResult);

      const req = { user };
      const result = await controller.create(createDto, req);

      expect(result).toEqual(expectedResult);
      expect(expensesService.create).toHaveBeenCalledWith(createDto, user);
    });
  });

  describe('findAll', () => {
    it('should return all expenses', async () => {
      const user = createMockUser();
      const expenses = [{ id: 'expense-1' }, { id: 'expense-2' }];

      mockExpensesService.findAll.mockResolvedValue(expenses);

      const req = { user };
      const result = await controller.findAll(req);

      expect(result).toEqual(expenses);
      expect(expensesService.findAll).toHaveBeenCalledWith(user);
    });
  });

  describe('findOne', () => {
    it('should return expense by id', async () => {
      const user = createMockUser();
      const expense = { id: 'expense-id', amount: 15000 };

      mockExpensesService.findOne.mockResolvedValue(expense);

      const req = { user };
      const result = await controller.findOne('expense-id', req);

      expect(result).toEqual(expense);
      expect(expensesService.findOne).toHaveBeenCalledWith('expense-id', user);
    });
  });

  describe('update', () => {
    it('should update expense successfully', async () => {
      const user = createMockUser();
      const updateDto: UpdateExpenseDto = {
        observations: 'Updated observations',
      };

      const updatedExpense = {
        id: 'expense-id',
        observations: 'Updated observations',
      };

      mockExpensesService.update.mockResolvedValue(updatedExpense);

      const req = { user };
      const result = await controller.update('expense-id', updateDto, req);

      expect(result).toEqual(updatedExpense);
      expect(expensesService.update).toHaveBeenCalledWith('expense-id', updateDto, user);
    });
  });

  describe('validate', () => {
    it('should validate expense successfully', async () => {
      const user = createMockUser();
      const validateDto: ValidateExpenseDto = {
        state: ExpenseState.VALIDATED,
        observations: 'All good',
      };

      const validatedExpense = {
        id: 'expense-id',
        state: ExpenseState.VALIDATED,
        validated_by_id: user.id,
      };

      mockExpensesService.validate.mockResolvedValue(validatedExpense);

      const req = { user };
      const result = await controller.validate('expense-id', validateDto, req);

      expect(result).toEqual(validatedExpense);
      expect(expensesService.validate).toHaveBeenCalledWith('expense-id', validateDto, user);
    });
  });

  describe('remove', () => {
    it('should delete expense successfully', async () => {
      const user = createMockUser();
      mockExpensesService.remove.mockResolvedValue(undefined);

      const req = { user };
      await controller.remove('expense-id', req);

      expect(expensesService.remove).toHaveBeenCalledWith('expense-id', user);
    });
  });
});

