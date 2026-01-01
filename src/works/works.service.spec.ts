import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorksService } from './works.service';
import { Work } from './works.entity';
import { Expense } from '../expenses/expenses.entity';
import { Income } from '../incomes/incomes.entity';
import { Schedule } from '../schedule/schedule.entity';
import { ScheduleService } from '../schedule/schedule.service';
import { ExpenseState } from '../common/enums/expense-state.enum';
import { WorkStatus } from '../common/enums/work-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { createMockUser } from '../common/test/test-helpers';

describe('WorksService', () => {
  let service: WorksService;
  let workRepository: Repository<Work>;
  let expenseRepository: Repository<Expense>;
  let incomeRepository: Repository<Income>;

  const mockWorkRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockExpenseRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockIncomeRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockScheduleRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockScheduleService = {
    generateAutomaticGantt: jest.fn(),
  };

  const mockWork: Work = {
    id: 'work-id',
    name: 'Test Work',
    client: 'Test Client',
    address: 'Test Address',
    start_date: new Date(),
    end_date: null,
    status: 'active' as any,
    currency: 'ars' as any,
    supervisor_id: null,
    supervisor: null,
    organization_id: null,
    organization: null,
    total_budget: 100000,
    total_expenses: 0,
    total_incomes: 0,
    physical_progress: 0,
    economic_progress: 0,
    financial_progress: 0,
    created_at: new Date(),
    updated_at: new Date(),
    budgets: [],
    contracts: [],
    expenses: [],
    incomes: [],
    schedules: [],
    documents: [],
  } as Work;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorksService,
        {
          provide: getRepositoryToken(Work),
          useValue: mockWorkRepository,
        },
        {
          provide: getRepositoryToken(Expense),
          useValue: mockExpenseRepository,
        },
        {
          provide: getRepositoryToken(Income),
          useValue: mockIncomeRepository,
        },
        {
          provide: getRepositoryToken(Schedule),
          useValue: mockScheduleRepository,
        },
        {
          provide: ScheduleService,
          useValue: mockScheduleService,
        },
      ],
    }).compile();

    service = module.get<WorksService>(WorksService);
    workRepository = module.get<Repository<Work>>(getRepositoryToken(Work));
    expenseRepository = module.get<Repository<Expense>>(getRepositoryToken(Expense));
    incomeRepository = module.get<Repository<Income>>(getRepositoryToken(Income));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateWorkTotals', () => {
    it('should update work totals with validated expenses and incomes', async () => {
      const workId = 'work-id';

      // Mock expense query builder
      const mockExpenseQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '50000' }),
      };
      mockExpenseRepository.createQueryBuilder.mockReturnValue(mockExpenseQueryBuilder);

      // Mock income query builder
      const mockIncomeQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '80000' }),
      };
      mockIncomeRepository.createQueryBuilder.mockReturnValue(mockIncomeQueryBuilder);

      mockWorkRepository.findOne.mockResolvedValue(mockWork);
      mockWorkRepository.save.mockResolvedValue({
        ...mockWork,
        total_expenses: 50000,
        total_incomes: 80000,
      });

      await service.updateWorkTotals(workId);

      expect(mockWorkRepository.findOne).toHaveBeenCalledWith({ where: { id: workId } });
      expect(mockExpenseRepository.createQueryBuilder).toHaveBeenCalledWith('expense');
      expect(mockExpenseQueryBuilder.where).toHaveBeenCalledWith('expense.work_id = :workId', {
        workId,
      });
      expect(mockExpenseQueryBuilder.andWhere).toHaveBeenCalledWith('expense.state = :state', {
        state: ExpenseState.VALIDATED,
      });
      expect(mockIncomeRepository.createQueryBuilder).toHaveBeenCalledWith('income');
      expect(mockIncomeQueryBuilder.where).toHaveBeenCalledWith('income.work_id = :workId', {
        workId,
      });
      expect(mockIncomeQueryBuilder.andWhere).toHaveBeenCalledWith(
        'income.is_validated = :isValidated',
        { isValidated: true },
      );
      expect(mockWorkRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          total_expenses: 50000,
          total_incomes: 80000,
        }),
      );
    });

    it('should handle work not found gracefully', async () => {
      const workId = 'non-existent-work';

      mockWorkRepository.findOne.mockResolvedValue(null);

      await service.updateWorkTotals(workId);

      expect(mockWorkRepository.findOne).toHaveBeenCalledWith({ where: { id: workId } });
      expect(mockExpenseRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(mockIncomeRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(mockWorkRepository.save).not.toHaveBeenCalled();
    });

    it('should handle zero totals when no validated expenses or incomes', async () => {
      const workId = 'work-id';

      // Mock expense query builder with zero total
      const mockExpenseQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: null }),
      };
      mockExpenseRepository.createQueryBuilder.mockReturnValue(mockExpenseQueryBuilder);

      // Mock income query builder with zero total
      const mockIncomeQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: null }),
      };
      mockIncomeRepository.createQueryBuilder.mockReturnValue(mockIncomeQueryBuilder);

      mockWorkRepository.findOne.mockResolvedValue(mockWork);
      mockWorkRepository.save.mockResolvedValue({
        ...mockWork,
        total_expenses: 0,
        total_incomes: 0,
      });

      await service.updateWorkTotals(workId);

      expect(mockWorkRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          total_expenses: 0,
          total_incomes: 0,
        }),
      );
    });
  });

  describe('close', () => {
    it('should close work successfully when user is Direction', async () => {
      const user = createMockUser({ role: { name: UserRole.DIRECTION } });
      const activeWork = {
        ...mockWork,
        status: WorkStatus.ACTIVE,
        end_date: null,
      };

      mockWorkRepository.findOne.mockResolvedValue(activeWork);
      mockWorkRepository.save.mockResolvedValue({
        ...activeWork,
        status: WorkStatus.FINISHED,
        end_date: expect.any(Date),
      });

      const result = await service.close('work-id', user);

      expect(result.status).toBe(WorkStatus.FINISHED);
      expect(result.end_date).toBeDefined();
      expect(mockWorkRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when non-Direction tries to close work', async () => {
      const user = createMockUser({ role: { name: UserRole.ADMINISTRATION } });
      const activeWork = {
        ...mockWork,
        status: WorkStatus.ACTIVE,
      };

      mockWorkRepository.findOne.mockResolvedValue(activeWork);

      await expect(service.close('work-id', user)).rejects.toThrow(ForbiddenException);
      await expect(service.close('work-id', user)).rejects.toThrow(
        'Only Direction can close works',
      );
      expect(mockWorkRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when trying to close already closed work', async () => {
      const user = createMockUser({ role: { name: UserRole.DIRECTION } });
      const finishedWork = {
        ...mockWork,
        status: WorkStatus.FINISHED,
      };

      mockWorkRepository.findOne.mockResolvedValue(finishedWork);

      await expect(service.close('work-id', user)).rejects.toThrow(BadRequestException);
      await expect(service.close('work-id', user)).rejects.toThrow('Work is already closed');
      expect(mockWorkRepository.save).not.toHaveBeenCalled();
    });

    it('should set end_date if not already set when closing', async () => {
      const user = createMockUser({ role: { name: UserRole.DIRECTION } });
      const activeWork = {
        ...mockWork,
        status: WorkStatus.ACTIVE,
        end_date: null,
      };

      mockWorkRepository.findOne.mockResolvedValue(activeWork);
      mockWorkRepository.save.mockResolvedValue({
        ...activeWork,
        status: WorkStatus.FINISHED,
        end_date: new Date(),
      });

      const result = await service.close('work-id', user);

      expect(result.end_date).toBeDefined();
      expect(mockWorkRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: WorkStatus.FINISHED,
          end_date: expect.any(Date),
        }),
      );
    });
  });
});

