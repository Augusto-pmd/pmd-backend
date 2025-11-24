import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkBudget } from './work-budgets.entity';
import { Work } from '../works/works.entity';
import { CreateWorkBudgetDto } from './dto/create-work-budget.dto';
import { UpdateWorkBudgetDto } from './dto/update-work-budget.dto';

@Injectable()
export class WorkBudgetsService {
  constructor(
    @InjectRepository(WorkBudget)
    private workBudgetRepository: Repository<WorkBudget>,
    @InjectRepository(Work)
    private workRepository: Repository<Work>,
  ) {}

  async create(createWorkBudgetDto: CreateWorkBudgetDto): Promise<WorkBudget> {
    const work = await this.workRepository.findOne({
      where: { id: createWorkBudgetDto.work_id },
    });

    if (!work) {
      throw new NotFoundException(`Work with ID ${createWorkBudgetDto.work_id} not found`);
    }

    const budget = this.workBudgetRepository.create(createWorkBudgetDto);
    const savedBudget = await this.workBudgetRepository.save(budget);

    // Update work total budget
    const budgets = await this.workBudgetRepository.find({
      where: { work_id: createWorkBudgetDto.work_id },
    });
    work.total_budget = budgets.reduce((sum, b) => sum + parseFloat(b.amount.toString()), 0);
    await this.workRepository.save(work);

    return savedBudget;
  }

  async findAll(): Promise<WorkBudget[]> {
    return await this.workBudgetRepository.find({
      relations: ['work'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<WorkBudget> {
    const budget = await this.workBudgetRepository.findOne({
      where: { id },
      relations: ['work'],
    });

    if (!budget) {
      throw new NotFoundException(`Work budget with ID ${id} not found`);
    }

    return budget;
  }

  async update(id: string, updateWorkBudgetDto: UpdateWorkBudgetDto): Promise<WorkBudget> {
    const budget = await this.findOne(id);
    Object.assign(budget, updateWorkBudgetDto);
    return await this.workBudgetRepository.save(budget);
  }

  async remove(id: string): Promise<void> {
    const budget = await this.findOne(id);
    await this.workBudgetRepository.remove(budget);
  }
}


