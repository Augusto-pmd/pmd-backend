import { Injectable, NotFoundException, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Income } from './incomes.entity';
import { Work } from '../works/works.entity';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { User } from '../users/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { WorksService } from '../works/works.service';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';

@Injectable()
export class IncomesService {
  private readonly logger = new Logger(IncomesService.name);

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
      throw new ForbiddenException('Solo Administración y Dirección pueden crear ingresos');
    }

    const work = await this.workRepository.findOne({
      where: { id: createIncomeDto.work_id },
    });

    if (!work) {
      throw new NotFoundException(`Work with ID ${createIncomeDto.work_id} not found`);
    }

    const income = this.incomeRepository.create(createIncomeDto);
    const savedIncome = await this.incomeRepository.save(income);

    // Update work totals and progress if income is validated
    if (createIncomeDto.is_validated) {
      await this.worksService.updateWorkTotals(work.id);
      await this.worksService.updateAllProgress(work.id);
    }

    return savedIncome;
  }

  async findAll(user: User): Promise<Income[]> {
    try {
      const organizationId = getOrganizationId(user);
      const queryBuilder = this.incomeRepository
        .createQueryBuilder('income')
        .leftJoinAndSelect('income.work', 'work');

      // Filter by organization_id through work
      if (organizationId) {
        queryBuilder.where('work.organization_id = :organizationId', { organizationId });
      }

      return await queryBuilder.orderBy('income.date', 'DESC').getMany();
    } catch (error) {
      this.logger.error('Error fetching incomes', error);
      return [];
    }
  }

  async findOne(id: string, user: User): Promise<Income> {
    const organizationId = getOrganizationId(user);
    const income = await this.incomeRepository.findOne({
      where: { id },
      relations: ['work'],
    });

    if (!income) {
      throw new NotFoundException(`Income with ID ${id} not found`);
    }

    // Validate ownership through work.organization_id
    if (organizationId && income.work?.organization_id !== organizationId) {
      throw new ForbiddenException('El ingreso no pertenece a tu organización');
    }

    return income;
  }

  async update(id: string, updateIncomeDto: UpdateIncomeDto, user: User): Promise<Income> {
    const income = await this.findOne(id, user);
    
    // Validate amount is not negative
    if (updateIncomeDto.amount !== undefined && updateIncomeDto.amount < 0) {
      throw new BadRequestException('Amount cannot be negative');
    }
    
    const wasValidated = income.is_validated;
    Object.assign(income, updateIncomeDto);
    const savedIncome = await this.incomeRepository.save(income);

    // Update work totals and progress if validation status changed
    if (wasValidated !== savedIncome.is_validated) {
      await this.worksService.updateWorkTotals(savedIncome.work_id);
      await this.worksService.updateAllProgress(savedIncome.work_id);
    }

    return savedIncome;
  }

  async remove(id: string, user: User): Promise<void> {
    const income = await this.findOne(id, user);
    await this.incomeRepository.remove(income);
  }
}


