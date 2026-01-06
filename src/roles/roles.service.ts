import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { User } from '../users/user.entity';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async create(createRoleDto: CreateRoleDto, currentUser?: User): Promise<Role> {
    // Validate permissions at service level (double check)
    if (currentUser && currentUser.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Solo Dirección puede crear roles');
    }

    const role = this.roleRepository.create(createRoleDto);
    return await this.roleRepository.save(role);
  }

  async findAll(currentUser?: User): Promise<Role[]> {
    try {
      // Validate permissions at service level (double check)
      if (currentUser) {
        if (currentUser.role.name !== UserRole.DIRECTION) {
          throw new ForbiddenException('Solo Dirección puede ver roles');
        }
      }

      return await this.roleRepository.find();
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('Error fetching roles', error);
      return [];
    }
  }

  async findOne(id: string, currentUser?: User): Promise<Role> {
    // Validate permissions at service level (double check)
    if (currentUser) {
      if (currentUser.role.name !== UserRole.DIRECTION) {
        throw new ForbiddenException('Only Direction can view roles');
      }
    }

    const role = await this.roleRepository.findOne({ where: { id } });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto, currentUser?: User): Promise<Role> {
    // Validate permissions at service level (double check)
    if (currentUser && currentUser.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Solo Dirección puede actualizar roles');
    }

    const role = await this.findOne(id, currentUser);
    Object.assign(role, updateRoleDto);
    return await this.roleRepository.save(role);
  }

  async remove(id: string, currentUser?: User): Promise<void> {
    // Validate permissions at service level (double check)
    if (currentUser && currentUser.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException('Solo Dirección puede eliminar roles');
    }

    const role = await this.findOne(id, currentUser);
    await this.roleRepository.remove(role);
  }

  async getPermissions(id: string, currentUser?: User): Promise<Record<string, boolean>> {
    // Validate permissions at service level (double check)
    if (currentUser) {
      if (currentUser.role.name !== UserRole.DIRECTION) {
        throw new ForbiddenException('Solo Dirección puede ver los permisos de los roles');
      }
    }

    const role = await this.findOne(id, currentUser);
    // Ensure permissions is always a Record<string, boolean>
    if (!role.permissions || typeof role.permissions !== 'object' || Array.isArray(role.permissions)) {
      return {};
    }
    // Convert to Record<string, boolean> if needed
    const permissions: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(role.permissions)) {
      permissions[key] = Boolean(value);
    }
    return permissions;
  }
}


