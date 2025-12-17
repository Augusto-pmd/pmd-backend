import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Income } from './incomes.entity';
import { Work } from '../works/works.entity';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { User } from '../users/user.entity';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class IncomesService {
  constructor(
    @InjectRepository(Income)
    private incomeRepository: Repository<Income>,
    @InjectRepository(Work)
    private workRepository: Repository<Work>,
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

    // Update work totals
    work.total_incomes = (parseFloat(work.total_incomes.toString()) || 0) + parseFloat(createIncomeDto.amount.toString());
    await this.workRepository.save(work);

    return savedIncome;
  }

  async findAll(user: User): Promise<Income[]> {
    try {
      return await this.incomeRepository.find({
        relations: ['work'],
        order: { date: 'DESC' },
      });
    } catch (error) {
      console.error('[IncomesService.findAll] Error:', error);
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
    Object.assign(income, updateIncomeDto);
    return await this.incomeRepository.save(income);
  }

  async remove(id: string, user: User): Promise<void> {
    const income = await this.findOne(id, user);
    await this.incomeRepository.remove(income);
  }
}


