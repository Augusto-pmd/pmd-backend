import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkUser } from './work-users.entity';
import { Work } from '../works/works.entity';
import { User } from '../users/user.entity';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';

@Injectable()
export class WorkUsersService {
  private readonly logger = new Logger(WorkUsersService.name);

  constructor(
    @InjectRepository(WorkUser)
    private workUserRepository: Repository<WorkUser>,
    @InjectRepository(Work)
    private workRepository: Repository<Work>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async assignUser(workId: string, userId: string, role?: string, currentUser?: User): Promise<WorkUser> {
    // Verificar que la obra existe y pertenece a la organización del usuario
    const work = await this.workRepository.findOne({ where: { id: workId } });
    if (!work) {
      throw new NotFoundException(`Work with ID ${workId} not found`);
    }

    if (currentUser) {
      const organizationId = getOrganizationId(currentUser);
      if (organizationId && work.organization_id !== organizationId) {
        throw new BadRequestException('Work does not belong to your organization');
      }
    }

    // Verificar que el usuario existe
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Verificar que no esté ya asignado
    const existing = await this.workUserRepository.findOne({
      where: { work_id: workId, user_id: userId },
    });

    if (existing) {
      throw new BadRequestException('User is already assigned to this work');
    }

    // Crear la asignación
    const workUser = this.workUserRepository.create({
      work_id: workId,
      user_id: userId,
      role: role || null,
    });

    return await this.workUserRepository.save(workUser);
  }

  async unassignUser(workId: string, userId: string, currentUser?: User): Promise<void> {
    // Verificar que la obra existe y pertenece a la organización del usuario
    const work = await this.workRepository.findOne({ where: { id: workId } });
    if (!work) {
      throw new NotFoundException(`Work with ID ${workId} not found`);
    }

    if (currentUser) {
      const organizationId = getOrganizationId(currentUser);
      if (organizationId && work.organization_id !== organizationId) {
        throw new BadRequestException('Work does not belong to your organization');
      }
    }

    // Buscar y eliminar la asignación
    const workUser = await this.workUserRepository.findOne({
      where: { work_id: workId, user_id: userId },
    });

    if (!workUser) {
      throw new NotFoundException('User is not assigned to this work');
    }

    await this.workUserRepository.remove(workUser);
  }

  async getAssignedUsers(workId: string, currentUser?: User): Promise<User[]> {
    // Verificar que la obra existe y pertenece a la organización del usuario
    const work = await this.workRepository.findOne({ where: { id: workId } });
    if (!work) {
      throw new NotFoundException(`Work with ID ${workId} not found`);
    }

    if (currentUser) {
      const organizationId = getOrganizationId(currentUser);
      if (organizationId && work.organization_id !== organizationId) {
        throw new BadRequestException('Work does not belong to your organization');
      }
    }

    // Obtener usuarios asignados
    const workUsers = await this.workUserRepository.find({
      where: { work_id: workId },
      relations: ['user', 'user.role'],
    });

    return workUsers.map((wu) => wu.user);
  }
}

