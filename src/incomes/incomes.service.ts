import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Income } from './incomes.entity';
import { Work } from '../works/works.entity';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { User } from '../users/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { WorksService } from '../works/works.service';

@Injectable()
export class IncomesService {
  constructor(
    @InjectRepository(Income)
    private incomeRepository: Repository<Income>,
    @InjectRepository(Work)
    private workRepository: Repository<Work>,
    private worksService: WorksService,
  ) {}

  async create(createIncomeDto: CreateIncomeDto, user: User): Promise<Income> {
    // Only Administration and Direction can create incomes
    if (user.role.name !== UserRole.ADMINISTRATION && user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Only Administration and Direction can create incomes');
    }

    const work = await this.workRepository.findOne({
      where: { id: createIncomeDto.work_id },
    });

    if (!work) {
      throw new NotFoundException(`Work with ID ${createIncomeDto.work_id} not found`);
    }

    const income = this.incomeRepository.create(createIncomeDto);
    const savedIncome = await this.incomeRepository.save(income);

    // Update work totals if income is validated
    if (createIncomeDto.is_validated) {
      await this.worksService.updateWorkTotals(work.id);
    }

    return savedIncome;
  }

  async findAll(user: User): Promise<Income[]> {
    try {
      return await this.incomeRepository.find({
        relations: ['work'],
        order: { date: 'DESC' },
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[IncomesService.findAll] Error:', error);
      }
      return [];
    }
  }

  async findOne(id: string, user: User): Promise<Income> {
    const income = await this.incomeRepository.findOne({
      where: { id },
      relations: ['work'],
    });

    if (!income) {
      throw new NotFoundException(`Income with ID ${id} not found`);
    }

    return income;
  }

  async update(id: string, updateIncomeDto: UpdateIncomeDto, user: User): Promise<Income> {
    const income = await this.findOne(id, user);
    const wasValidated = income.is_validated;
    Object.assign(income, updateIncomeDto);
    const savedIncome = await this.incomeRepository.save(income);

    // Update work totals if validation status changed
    if (wasValidated !== savedIncome.is_validated) {
      await this.worksService.updateWorkTotals(savedIncome.work_id);
    }

    return savedIncome;
  }

  async remove(id: string, user: User): Promise<void> {
    const income = await this.findOne(id, user);
    await this.incomeRepository.remove(income);
  }
}


