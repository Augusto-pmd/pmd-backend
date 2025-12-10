import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Work } from './works.entity';
import { CreateWorkDto } from './dto/create-work.dto';
import { UpdateWorkDto } from './dto/update-work.dto';
import { User } from '../users/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';

@Injectable()
export class WorksService {
  constructor(
    @InjectRepository(Work)
    private workRepository: Repository<Work>,
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
    const organizationId = getOrganizationId(user);
    const queryBuilder = this.workRepository.createQueryBuilder('work');

    if (organizationId) {
      queryBuilder.where('work.organization_id = :organizationId', {
        organizationId,
      });
    }

    if (user.role.name === UserRole.SUPERVISOR) {
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
}

