import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { WorksService } from './works.service';
import { Work } from './works.entity';
import { Expense } from '../expenses/expenses.entity';
import { Income } from '../incomes/incomes.entity';
import { Schedule } from '../schedule/schedule.entity';
import { ScheduleService } from '../schedule/schedule.service';
import { UserRole } from '../common/enums/user-role.enum';
import { createMockUser } from '../common/test/test-helpers';
import { WorkStatsDto } from './dto/work-stats.dto';

/**
 * Unit tests for WorksService.getWorkStats()
 * 
 * Adapted from PMD-asistencias Contractor stats logic.
 * Tests the calculation of work statistics including remaining balance and profitability.
 */
describe('WorksService - getWorkStats (PMD Asistencias)', () => {
  let service: WorksService;
  let workRepository: Repository<Work>;
  let expenseRepository: Repository<Expense>;
  let incomeRepository: Repository<Income>;
  let scheduleRepository: Repository<Schedule>;

  const mockWorkRepository = {
    findOne: jest.fn(),
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
  };

  const mockScheduleService = {
    generateAutomaticGantt: jest.fn(),
  };

  const mockWork: Work = {
    id: 'work-id-1',
    name: 'Test Work',
    client: 'Test Client',
    address: 'Test Address',
    start_date: new Date('2024-01-01'),
    end_date: null,
    status: 'active' as any,
    currency: 'ars' as any,
    supervisor_id: 'supervisor-id-1',
    supervisor: null,
    organization_id: 'org-id-1',
    organization: null,
    total_budget: 1000000,
    total_expenses: 350000,
    total_incomes: 450000,
    physical_progress: 45.5,
    economic_progress: 45.0,
    financial_progress: 56.25,
    work_type: null,
    allow_post_closure_expenses: false,
    post_closure_enabled_by_id: null,
    post_closure_enabled_by: null,
    post_closure_enabled_at: null,
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
    scheduleRepository = module.get<Repository<Schedule>>(getRepositoryToken(Schedule));

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getWorkStats', () => {
    const mockUser = createMockUser({
      id: 'user-id-1',
      role: { name: UserRole.ADMINISTRATION },
      organization: { id: 'org-id-1' },
    });

    it('should calculate correct statistics for a work with expenses and incomes', async () => {
      // Arrange
      mockWorkRepository.findOne.mockResolvedValue({
        ...mockWork,
        relations: ['supervisor', 'budgets', 'contracts', 'expenses', 'incomes'],
      });

      // Act
      const result = await service.getWorkStats('work-id-1', mockUser);

      // Assert
      expect(result).toBeDefined();
      expect(result.work_id).toBe('work-id-1');
      expect(result.work_name).toBe('Test Work');
      expect(result.total_budget).toBe(1000000);
      expect(result.total_expenses).toBe(350000);
      expect(result.total_incomes).toBe(450000);
      expect(result.remaining_balance).toBe(650000); // 1000000 - 350000
      expect(result.profitability).toBe(100000); // 450000 - 350000
      expect(result.physical_progress).toBe(45.5);
      expect(result.economic_progress).toBe(45.0);
      expect(result.financial_progress).toBe(56.25);
      expect(mockWorkRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'work-id-1' },
        relations: ['supervisor', 'budgets', 'contracts', 'expenses', 'incomes'],
      });
    });

    it('should calculate remaining_balance as 0 when expenses exceed budget', async () => {
      // Arrange
      const workWithoutBalance: Work = {
        ...mockWork,
        total_budget: 100000,
        total_expenses: 150000, // Exceeds budget
      };

      mockWorkRepository.findOne.mockResolvedValue({
        ...workWithoutBalance,
        relations: ['supervisor', 'budgets', 'contracts', 'expenses', 'incomes'],
      });

      // Act
      const result = await service.getWorkStats('work-id-1', mockUser);

      // Assert
      expect(result.remaining_balance).toBe(0); // Should not be negative
      expect(result.total_budget).toBe(100000);
      expect(result.total_expenses).toBe(150000);
    });

    it('should handle work without expenses (remaining_balance = total_budget)', async () => {
      // Arrange
      const workWithoutExpenses: Work = {
        ...mockWork,
        total_budget: 1000000,
        total_expenses: 0,
        total_incomes: 0,
      };

      mockWorkRepository.findOne.mockResolvedValue({
        ...workWithoutExpenses,
        relations: ['supervisor', 'budgets', 'contracts', 'expenses', 'incomes'],
      });

      // Act
      const result = await service.getWorkStats('work-id-1', mockUser);

      // Assert
      expect(result.remaining_balance).toBe(1000000);
      expect(result.total_expenses).toBe(0);
      expect(result.total_incomes).toBe(0);
      expect(result.profitability).toBe(0);
    });

    it('should handle work without budget (total_budget = 0)', async () => {
      // Arrange
      const workWithoutBudget: Work = {
        ...mockWork,
        total_budget: 0,
        total_expenses: 50000,
        total_incomes: 30000,
      };

      mockWorkRepository.findOne.mockResolvedValue({
        ...workWithoutBudget,
        relations: ['supervisor', 'budgets', 'contracts', 'expenses', 'incomes'],
      });

      // Act
      const result = await service.getWorkStats('work-id-1', mockUser);

      // Assert
      expect(result.total_budget).toBe(0);
      expect(result.remaining_balance).toBe(0); // 0 - 50000, clamped to 0
      expect(result.total_expenses).toBe(50000);
      expect(result.profitability).toBe(-20000); // 30000 - 50000 (negative profitability)
    });

    it('should handle work with null/undefined values gracefully', async () => {
      // Arrange
      const workWithNulls: Work = {
        ...mockWork,
        total_budget: null as any,
        total_expenses: null as any,
        total_incomes: null as any,
        physical_progress: null as any,
        economic_progress: null as any,
        financial_progress: null as any,
      };

      mockWorkRepository.findOne.mockResolvedValue({
        ...workWithNulls,
        relations: ['supervisor', 'budgets', 'contracts', 'expenses', 'incomes'],
      });

      // Act
      const result = await service.getWorkStats('work-id-1', mockUser);

      // Assert
      expect(result.total_budget).toBe(0);
      expect(result.total_expenses).toBe(0);
      expect(result.total_incomes).toBe(0);
      expect(result.remaining_balance).toBe(0);
      expect(result.profitability).toBe(0);
      expect(result.physical_progress).toBe(0);
      expect(result.economic_progress).toBe(0);
      expect(result.financial_progress).toBe(0);
    });

    it('should calculate negative profitability when expenses exceed incomes', async () => {
      // Arrange
      const workWithLoss: Work = {
        ...mockWork,
        total_budget: 1000000,
        total_expenses: 500000,
        total_incomes: 300000,
      };

      mockWorkRepository.findOne.mockResolvedValue({
        ...workWithLoss,
        relations: ['supervisor', 'budgets', 'contracts', 'expenses', 'incomes'],
      });

      // Act
      const result = await service.getWorkStats('work-id-1', mockUser);

      // Assert
      expect(result.profitability).toBe(-200000); // 300000 - 500000
      expect(result.total_expenses).toBe(500000);
      expect(result.total_incomes).toBe(300000);
    });

    it('should throw NotFoundException when work does not exist', async () => {
      // Arrange
      mockWorkRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getWorkStats('non-existent-id', mockUser)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getWorkStats('non-existent-id', mockUser)).rejects.toThrow(
        'Work with ID non-existent-id not found',
      );
    });

    it('should throw ForbiddenException when work belongs to different organization', async () => {
      // Arrange
      const userDifferentOrg = createMockUser({
        id: 'user-id-2',
        role: { name: UserRole.ADMINISTRATION },
        organization: { id: 'org-id-2' }, // Different organization
      });

      mockWorkRepository.findOne.mockResolvedValue({
        ...mockWork,
        organization_id: 'org-id-1',
        relations: ['supervisor', 'budgets', 'contracts', 'expenses', 'incomes'],
      });

      // Act & Assert
      await expect(service.getWorkStats('work-id-1', userDifferentOrg)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.getWorkStats('work-id-1', userDifferentOrg)).rejects.toThrow(
        'Work does not belong to your organization',
      );
    });

    it('should throw ForbiddenException when supervisor tries to access non-assigned work', async () => {
      // Arrange
      const supervisorUser = createMockUser({
        id: 'supervisor-id-2', // Different supervisor
        role: { name: UserRole.SUPERVISOR },
        organization: { id: 'org-id-1' },
      });

      mockWorkRepository.findOne.mockResolvedValue({
        ...mockWork,
        supervisor_id: 'supervisor-id-1', // Different supervisor assigned
        relations: ['supervisor', 'budgets', 'contracts', 'expenses', 'incomes'],
      });

      // Act & Assert
      await expect(service.getWorkStats('work-id-1', supervisorUser)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.getWorkStats('work-id-1', supervisorUser)).rejects.toThrow(
        'You can only view works you supervise',
      );
    });

    it('should allow supervisor to access their assigned work', async () => {
      // Arrange
      const supervisorUser = createMockUser({
        id: 'supervisor-id-1',
        role: { name: UserRole.SUPERVISOR },
        organization: { id: 'org-id-1' },
      });

      mockWorkRepository.findOne.mockResolvedValue({
        ...mockWork,
        supervisor_id: 'supervisor-id-1', // Same supervisor
        relations: ['supervisor', 'budgets', 'contracts', 'expenses', 'incomes'],
      });

      // Act
      const result = await service.getWorkStats('work-id-1', supervisorUser);

      // Assert
      expect(result).toBeDefined();
      expect(result.work_id).toBe('work-id-1');
      expect(mockWorkRepository.findOne).toHaveBeenCalled();
    });

    it('should calculate remaining_balance correctly with multiple budgets', async () => {
      // Arrange
      // When multiple budgets exist, total_budget should already be summed
      // This test verifies the calculation works with the summed value
      const workWithMultipleBudgets: Work = {
        ...mockWork,
        total_budget: 2000000, // Sum of multiple budgets
        total_expenses: 800000,
      };

      mockWorkRepository.findOne.mockResolvedValue({
        ...workWithMultipleBudgets,
        relations: ['supervisor', 'budgets', 'contracts', 'expenses', 'incomes'],
      });

      // Act
      const result = await service.getWorkStats('work-id-1', mockUser);

      // Assert
      expect(result.total_budget).toBe(2000000);
      expect(result.total_expenses).toBe(800000);
      expect(result.remaining_balance).toBe(1200000); // 2000000 - 800000
    });

    it('should calculate profitability correctly with multiple incomes', async () => {
      // Arrange
      // When multiple incomes exist, total_incomes should already be summed
      const workWithMultipleIncomes: Work = {
        ...mockWork,
        total_expenses: 300000,
        total_incomes: 600000, // Sum of multiple incomes
      };

      mockWorkRepository.findOne.mockResolvedValue({
        ...workWithMultipleIncomes,
        relations: ['supervisor', 'budgets', 'contracts', 'expenses', 'incomes'],
      });

      // Act
      const result = await service.getWorkStats('work-id-1', mockUser);

      // Assert
      expect(result.total_expenses).toBe(300000);
      expect(result.total_incomes).toBe(600000);
      expect(result.profitability).toBe(300000); // 600000 - 300000
    });

    it('should return correct stats type (WorkStatsDto)', async () => {
      // Arrange
      mockWorkRepository.findOne.mockResolvedValue({
        ...mockWork,
        relations: ['supervisor', 'budgets', 'contracts', 'expenses', 'incomes'],
      });

      // Act
      const result = await service.getWorkStats('work-id-1', mockUser);

      // Assert
      expect(result).toHaveProperty('work_id');
      expect(result).toHaveProperty('work_name');
      expect(result).toHaveProperty('total_budget');
      expect(result).toHaveProperty('total_expenses');
      expect(result).toHaveProperty('total_incomes');
      expect(result).toHaveProperty('remaining_balance');
      expect(result).toHaveProperty('physical_progress');
      expect(result).toHaveProperty('economic_progress');
      expect(result).toHaveProperty('financial_progress');
      expect(result).toHaveProperty('profitability');
      expect(typeof result.work_id).toBe('string');
      expect(typeof result.work_name).toBe('string');
      expect(typeof result.total_budget).toBe('number');
      expect(typeof result.total_expenses).toBe('number');
      expect(typeof result.total_incomes).toBe('number');
      expect(typeof result.remaining_balance).toBe('number');
      expect(typeof result.profitability).toBe('number');
    });
  });
});
