import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeAdvance } from './employee-advances.entity';
import { CreateEmployeeAdvanceDto } from './dto/create-employee-advance.dto';
import { UpdateEmployeeAdvanceDto } from './dto/update-employee-advance.dto';
import { User } from '../users/user.entity';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';

function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

@Injectable()
export class EmployeeAdvancesService {
  private readonly logger = new Logger(EmployeeAdvancesService.name);

  constructor(
    @InjectRepository(EmployeeAdvance)
    private employeeAdvancesRepository: Repository<EmployeeAdvance>,
  ) {}

  async findAll(
    user: User,
    filters?: {
      filterByOrganization?: boolean;
      employee_id?: string;
      week_start_date?: string;
    },
  ): Promise<EmployeeAdvance[]> {
    try {
      const organizationId = getOrganizationId(user);
      const qb = this.employeeAdvancesRepository
        .createQueryBuilder('advance')
        .leftJoinAndSelect('advance.employee', 'employee')
        .orderBy('advance.date', 'DESC')
        .addOrderBy('advance.created_at', 'DESC');

      if (filters?.filterByOrganization === true && organizationId) {
        qb.andWhere('advance.organization_id = :organizationId', { organizationId });
      }

      if (filters?.employee_id) {
        qb.andWhere('advance.employee_id = :employee_id', { employee_id: filters.employee_id });
      }

      if (filters?.week_start_date) {
        qb.andWhere('advance.week_start_date = :week_start_date', {
          week_start_date: filters.week_start_date,
        });
      }

      return await qb.getMany();
    } catch (error) {
      this.logger.error('Error fetching employee advances', error);
      return [];
    }
  }

  async findOne(id: string, user: User): Promise<EmployeeAdvance> {
    const advance = await this.employeeAdvancesRepository.findOne({
      where: { id },
      relations: ['employee', 'organization'],
    });

    if (!advance) {
      throw new NotFoundException(`EmployeeAdvance with ID ${id} not found`);
    }

    return advance;
  }

  async findByEmployee(
    employeeId: string,
    user: User,
    filterByOrganization = false,
  ): Promise<EmployeeAdvance[]> {
    const organizationId = getOrganizationId(user);
    const qb = this.employeeAdvancesRepository
      .createQueryBuilder('advance')
      .leftJoinAndSelect('advance.employee', 'employee')
      .where('advance.employee_id = :employee_id', { employee_id: employeeId })
      .orderBy('advance.date', 'DESC')
      .addOrderBy('advance.created_at', 'DESC');

    if (filterByOrganization === true && organizationId) {
      qb.andWhere('advance.organization_id = :organizationId', { organizationId });
    }

    return await qb.getMany();
  }

  async findByWeek(
    weekStartDate: string,
    user: User,
    filterByOrganization = false,
  ): Promise<EmployeeAdvance[]> {
    const organizationId = getOrganizationId(user);
    const qb = this.employeeAdvancesRepository
      .createQueryBuilder('advance')
      .leftJoinAndSelect('advance.employee', 'employee')
      .where('advance.week_start_date = :week_start_date', { week_start_date: weekStartDate })
      .orderBy('advance.date', 'DESC')
      .addOrderBy('advance.created_at', 'DESC');

    if (filterByOrganization === true && organizationId) {
      qb.andWhere('advance.organization_id = :organizationId', { organizationId });
    }

    return await qb.getMany();
  }

  async create(dto: CreateEmployeeAdvanceDto, user: User): Promise<EmployeeAdvance> {
    const date = new Date(dto.date);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Fecha inválida');
    }

    const weekStartDate = dto.week_start_date
      ? getWeekStartDate(new Date(dto.week_start_date))
      : getWeekStartDate(date);

    const organizationId = getOrganizationId(user);

    const advance = this.employeeAdvancesRepository.create({
      employee_id: dto.employee_id,
      amount: dto.amount,
      date,
      description: dto.description ?? null,
      week_start_date: weekStartDate,
      organization_id: organizationId,
    });

    return await this.employeeAdvancesRepository.save(advance);
  }

  async update(id: string, dto: UpdateEmployeeAdvanceDto, user: User): Promise<EmployeeAdvance> {
    const advance = await this.findOne(id, user);

    if (dto.date) {
      const date = new Date(dto.date);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('Fecha inválida');
      }
      advance.date = date;
      // Si no viene week_start_date explícito, recalcular desde date para mantener consistencia
      if (!dto.week_start_date) {
        advance.week_start_date = getWeekStartDate(date);
      }
    }

    if (dto.week_start_date) {
      const week = new Date(dto.week_start_date);
      if (Number.isNaN(week.getTime())) {
        throw new BadRequestException('week_start_date inválido');
      }
      advance.week_start_date = getWeekStartDate(week);
    }

    if (dto.employee_id) {
      advance.employee_id = dto.employee_id;
    }

    if (dto.amount !== undefined) {
      advance.amount = dto.amount;
    }

    if (dto.description !== undefined) {
      advance.description = dto.description ?? null;
    }

    return await this.employeeAdvancesRepository.save(advance);
  }

  async remove(id: string, user: User): Promise<{ deleted: boolean }> {
    const advance = await this.findOne(id, user);
    await this.employeeAdvancesRepository.remove(advance);
    return { deleted: true };
  }
}

