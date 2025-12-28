import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Work } from './works.entity';
import { Expense } from '../expenses/expenses.entity';
import { Income } from '../incomes/incomes.entity';
import { Schedule } from '../schedule/schedule.entity';
import { CreateWorkDto } from './dto/create-work.dto';
import { UpdateWorkDto } from './dto/update-work.dto';
import { User } from '../users/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { ExpenseState } from '../common/enums/expense-state.enum';
import { WorkStatus } from '../common/enums/work-status.enum';
import { ScheduleState } from '../common/enums/schedule-state.enum';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';
import { ScheduleService } from '../schedule/schedule.service';

@Injectable()
export class WorksService {
  private readonly logger = new Logger(WorksService.name);

  constructor(
    @InjectRepository(Work)
    private workRepository: Repository<Work>,
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
    @InjectRepository(Income)
    private incomeRepository: Repository<Income>,
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @Inject(forwardRef(() => ScheduleService))
    private scheduleService: ScheduleService,
  ) {}

  async create(createWorkDto: CreateWorkDto, user: User): Promise<Work> {
    const organizationId = getOrganizationId(user);
    const work = this.workRepository.create({
      ...createWorkDto,
      start_date: new Date(createWorkDto.start_date),
      end_date: createWorkDto.end_date ? new Date(createWorkDto.end_date) : null,
      organization_id: organizationId,
    });

    const savedWork = await this.workRepository.save(work);

    // Business Rule: Automatically generate Gantt chart when creating a work
    try {
      await this.scheduleService.generateAutomaticGantt(savedWork.id, user);
      this.logger.log(`Automatic Gantt chart generated for work ${savedWork.id}`);
    } catch (error) {
      // Log error but don't fail work creation if Gantt generation fails
      this.logger.warn(`Failed to generate automatic Gantt chart for work ${savedWork.id}: ${error.message}`);
    }

    return savedWork;
  }

  async findAll(user: User): Promise<Work[]> {
    try {
      const organizationId = getOrganizationId(user);
      const queryBuilder = this.workRepository.createQueryBuilder('work');

      if (organizationId) {
        queryBuilder.where('work.organization_id = :organizationId', {
          organizationId,
        });
      }

      if (user?.role?.name === UserRole.SUPERVISOR) {
        if (organizationId) {
          queryBuilder.andWhere('work.supervisor_id = :supervisorId', {
            supervisorId: user.id,
          });
        } else {
          queryBuilder.where('work.supervisor_id = :supervisorId', {
            supervisorId: user.id,
          });
        }
      }

      return await queryBuilder
        .leftJoinAndSelect('work.supervisor', 'supervisor')
        .leftJoinAndSelect('work.budgets', 'budgets')
        .leftJoinAndSelect('work.contracts', 'contracts')
        .getMany();
    } catch (error) {
      this.logger.error('Error fetching works', error);
      return [];
    }
  }

  async findOne(id: string, user: User): Promise<Work> {
    const organizationId = getOrganizationId(user);
    const work = await this.workRepository.findOne({
      where: { id },
      relations: ['supervisor', 'budgets', 'contracts', 'expenses', 'incomes'],
    });

    if (!work) {
      throw new NotFoundException(`Work with ID ${id} not found`);
    }

    if (organizationId && work.organization_id !== organizationId) {
      throw new ForbiddenException('Work does not belong to your organization');
    }

    if (
      user.role.name === UserRole.SUPERVISOR &&
      work.supervisor_id !== user.id
    ) {
      throw new ForbiddenException('You can only view works you supervise');
    }

    return work;
  }

  async update(
    id: string,
    updateWorkDto: UpdateWorkDto,
    user: User,
  ): Promise<Work> {
    const work = await this.findOne(id, user);

    if (
      user.role.name === UserRole.SUPERVISOR &&
      work.supervisor_id !== user.id
    ) {
      throw new ForbiddenException('You can only update works you supervise');
    }

    Object.assign(work, {
      ...updateWorkDto,
      start_date: updateWorkDto.start_date
        ? new Date(updateWorkDto.start_date)
        : work.start_date,
      end_date: updateWorkDto.end_date
        ? new Date(updateWorkDto.end_date)
        : work.end_date,
    });

    return await this.workRepository.save(work);
  }

  async remove(id: string, user: User): Promise<void> {
    const work = await this.findOne(id, user);
    await this.workRepository.remove(work);
  }

  /**
   * Business Rule: Only Direction can close works
   * Business Rule: Closing a work prevents expense creation (except exceptions)
   */
  async close(id: string, user: User): Promise<Work> {
    // Only Direction can close works
    if (user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Only Direction can close works');
    }

    const work = await this.findOne(id, user);

    // Check if work is already closed
    if (
      work.status === WorkStatus.FINISHED ||
      work.status === WorkStatus.ADMINISTRATIVELY_CLOSED ||
      work.status === WorkStatus.ARCHIVED
    ) {
      throw new BadRequestException('Work is already closed');
    }

    // Close the work (set status to FINISHED)
    work.status = WorkStatus.FINISHED;
    work.end_date = work.end_date || new Date();

    return await this.workRepository.save(work);
  }

  /**
   * Business Rule: Auto-update work totals when expenses/incomes are validated
   * Calculates total_expenses from validated expenses and total_incomes from validated incomes
   */
  async updateWorkTotals(workId: string): Promise<void> {
    const work = await this.workRepository.findOne({ where: { id: workId } });
    if (!work) {
      return;
    }

    // Calculate total_expenses from validated expenses
    const totalExpensesResult = await this.expenseRepository
      .createQueryBuilder('expense')
      .where('expense.work_id = :workId', { workId })
      .andWhere('expense.state = :state', { state: ExpenseState.VALIDATED })
      .select('SUM(expense.amount)', 'total')
      .getRawOne();

    const totalExpenses = parseFloat(totalExpensesResult?.total || '0');

    // Calculate total_incomes from validated incomes
    const totalIncomesResult = await this.incomeRepository
      .createQueryBuilder('income')
      .where('income.work_id = :workId', { workId })
      .andWhere('income.is_validated = :isValidated', { isValidated: true })
      .select('SUM(income.amount)', 'total')
      .getRawOne();

    const totalIncomes = parseFloat(totalIncomesResult?.total || '0');

    // Update work totals
    work.total_expenses = totalExpenses;
    work.total_incomes = totalIncomes;

    // Calculate profitability if applicable
    // profitability = total_incomes - total_expenses
    // This can be used for economic_progress calculation if needed

    await this.workRepository.save(work);
  }

  /**
   * Business Rule: Allow post-closure expenses
   * Business Rule: Only Direction can enable post-closure expenses
   * Business Rule: Can only be enabled for closed works
   */
  async allowPostClosure(id: string, user: User): Promise<Work> {
    // Only Direction can enable post-closure expenses
    if (user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Only Direction can enable post-closure expenses');
    }

    const work = await this.findOne(id, user);

    // Check if work is closed
    if (
      work.status !== WorkStatus.FINISHED &&
      work.status !== WorkStatus.ADMINISTRATIVELY_CLOSED &&
      work.status !== WorkStatus.ARCHIVED
    ) {
      throw new BadRequestException('Post-closure expenses can only be enabled for closed works');
    }

    // Enable post-closure expenses
    work.allow_post_closure_expenses = true;
    work.post_closure_enabled_by_id = user.id;
    work.post_closure_enabled_at = new Date();

    return await this.workRepository.save(work);
  }

  /**
   * Calculate physical progress based on completed stages
   * Physical progress = (completed stages / total stages) * 100
   */
  async calculatePhysicalProgress(workId: string): Promise<number> {
    const schedules = await this.scheduleRepository.find({
      where: { work_id: workId },
    });

    if (schedules.length === 0) {
      return 0;
    }

    const completedStages = schedules.filter(
      (schedule) => schedule.state === ScheduleState.COMPLETED,
    ).length;

    const progress = (completedStages / schedules.length) * 100;
    return Math.round(progress * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate economic progress based on incomes vs total budget
   * Economic progress = (total_incomes / total_budget) * 100
   */
  async calculateEconomicProgress(workId: string): Promise<number> {
    const work = await this.workRepository.findOne({
      where: { id: workId },
    });

    if (!work || !work.total_budget || work.total_budget === 0) {
      return 0;
    }

    // Calculate total validated incomes
    const totalIncomesResult = await this.incomeRepository
      .createQueryBuilder('income')
      .where('income.work_id = :workId', { workId })
      .andWhere('income.is_validated = :isValidated', { isValidated: true })
      .select('SUM(income.amount)', 'total')
      .getRawOne();

    const totalIncomes = parseFloat(totalIncomesResult?.total || '0');
    const progress = (totalIncomes / Number(work.total_budget)) * 100;
    return Math.min(Math.round(progress * 100) / 100, 100); // Cap at 100%
  }

  /**
   * Calculate financial progress based on incomes vs expenses
   * Financial progress = (total_incomes / (total_incomes + total_expenses)) * 100
   * This represents how much of the income has been received vs how much has been spent
   */
  async calculateFinancialProgress(workId: string): Promise<number> {
    // Calculate total validated incomes
    const totalIncomesResult = await this.incomeRepository
      .createQueryBuilder('income')
      .where('income.work_id = :workId', { workId })
      .andWhere('income.is_validated = :isValidated', { isValidated: true })
      .select('SUM(income.amount)', 'total')
      .getRawOne();

    const totalIncomes = parseFloat(totalIncomesResult?.total || '0');

    // Calculate total validated expenses
    const totalExpensesResult = await this.expenseRepository
      .createQueryBuilder('expense')
      .where('expense.work_id = :workId', { workId })
      .andWhere('expense.state = :state', { state: ExpenseState.VALIDATED })
      .select('SUM(expense.amount)', 'total')
      .getRawOne();

    const totalExpenses = parseFloat(totalExpensesResult?.total || '0');

    if (totalIncomes === 0 && totalExpenses === 0) {
      return 0;
    }

    // Financial progress = percentage of income received vs total (income + expenses)
    // If we have more income than expenses, progress is positive
    // If we have more expenses than income, progress is negative (represented as < 50%)
    const total = totalIncomes + totalExpenses;
    if (total === 0) {
      return 0;
    }

    const progress = (totalIncomes / total) * 100;
    return Math.round(progress * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Update all progress indicators for a work
   * This should be called automatically when:
   * - A stage is marked as completed
   * - An expense is validated
   * - An income is validated
   */
  async updateAllProgress(workId: string): Promise<Work> {
    const work = await this.workRepository.findOne({
      where: { id: workId },
    });

    if (!work) {
      throw new NotFoundException(`Work with ID ${workId} not found`);
    }

    // Calculate all progress indicators
    work.physical_progress = await this.calculatePhysicalProgress(workId);
    work.economic_progress = await this.calculateEconomicProgress(workId);
    work.financial_progress = await this.calculateFinancialProgress(workId);

    // Also update totals
    await this.updateWorkTotals(workId);

    // Reload work to get updated totals
    const updatedWork = await this.workRepository.findOne({
      where: { id: workId },
    });

    // Update progress again with fresh totals
    updatedWork.physical_progress = work.physical_progress;
    updatedWork.economic_progress = work.economic_progress;
    updatedWork.financial_progress = work.financial_progress;

    return await this.workRepository.save(updatedWork);
  }
}

