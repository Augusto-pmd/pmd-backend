import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Work } from './works.entity';
import { Expense } from '../expenses/expenses.entity';
import { Income } from '../incomes/incomes.entity';
import { CreateWorkDto } from './dto/create-work.dto';
import { UpdateWorkDto } from './dto/update-work.dto';
import { User } from '../users/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { ExpenseState } from '../common/enums/expense-state.enum';
import { WorkStatus } from '../common/enums/work-status.enum';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';

@Injectable()
export class WorksService {
  constructor(
    @InjectRepository(Work)
    private workRepository: Repository<Work>,
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
    @InjectRepository(Income)
    private incomeRepository: Repository<Income>,
  ) {}

  async create(createWorkDto: CreateWorkDto, user: User): Promise<Work> {
    const organizationId = getOrganizationId(user);
    const work = this.workRepository.create({
      ...createWorkDto,
      start_date: new Date(createWorkDto.start_date),
      end_date: createWorkDto.end_date ? new Date(createWorkDto.end_date) : null,
      organization_id: organizationId,
    });

    return await this.workRepository.save(work);
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
      console.error('[WorksService.findAll] Error:', error);
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
}

