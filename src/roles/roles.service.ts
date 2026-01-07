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

  async findAll(currentUser?: User): Promise<any[]> {
    try {
      // Validate permissions at service level (double check)
      if (currentUser) {
        if (currentUser.role.name !== UserRole.DIRECTION) {
          throw new ForbiddenException('Solo Dirección puede ver roles');
        }
      }

      // Obtener roles con conteo de usuarios
      const roles = await this.roleRepository
        .createQueryBuilder('role')
        .leftJoin('role.users', 'user')
        .select('role.id', 'id')
        .addSelect('role.name', 'name')
        .addSelect('role.description', 'description')
        .addSelect('role.permissions', 'permissions')
        .addSelect('role.created_at', 'created_at')
        .addSelect('role.updated_at', 'updated_at')
        .addSelect('COUNT(user.id)', 'userCount')
        .groupBy('role.id')
        .addGroupBy('role.name')
        .addGroupBy('role.description')
        .addGroupBy('role.permissions')
        .addGroupBy('role.created_at')
        .addGroupBy('role.updated_at')
        .getRawMany();

      // Procesar roles para convertir permisos a array y formatear fechas
      return roles.map((role) => {
        // Convertir permisos de Record<string, any> a array de strings (solo los activos)
        let permissionsArray: string[] = [];
        
        // Parsear permissions si es un string JSON
        let permissionsObj: any = role.permissions;
        if (typeof role.permissions === 'string') {
          try {
            permissionsObj = JSON.parse(role.permissions);
          } catch (e) {
            this.logger.warn(`Failed to parse permissions for role ${role.id}:`, e);
            permissionsObj = null;
          }
        }
        
        if (permissionsObj && typeof permissionsObj === 'object' && !Array.isArray(permissionsObj)) {
          // Verificar si es formato agrupado (ej: { "users": ["create", "read"] })
          // o formato plano (ej: { "users.create": true, "users.read": true })
          const keys = Object.keys(permissionsObj);
          const isGroupedFormat = keys.some(key => Array.isArray(permissionsObj[key]));
          
          if (isGroupedFormat) {
            // Convertir formato agrupado a formato plano y luego a array
            // Ej: { "users": ["create", "read"] } -> ["users.create", "users.read"]
            for (const [module, actions] of Object.entries(permissionsObj)) {
              if (Array.isArray(actions)) {
                for (const action of actions) {
                  if (typeof action === 'string') {
                    permissionsArray.push(`${module}.${action}`);
                  }
                }
              }
            }
          } else {
            // Formato plano: convertir a array de claves donde el valor es true
            permissionsArray = Object.keys(permissionsObj).filter(
              (key) => permissionsObj[key] === true || permissionsObj[key] === 'true'
            );
          }
        } else if (Array.isArray(permissionsObj)) {
          // Si ya es un array, usarlo directamente
          permissionsArray = permissionsObj.filter((p: any) => typeof p === 'string');
        }

        return {
          id: role.id,
          name: role.name,
          description: role.description,
          permissions: permissionsArray,
          createdAt: role.created_at ? new Date(role.created_at).toISOString() : null,
          updatedAt: role.updated_at ? new Date(role.updated_at).toISOString() : null,
          userCount: parseInt(role.userCount || '0', 10),
        };
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('Error fetching roles', error);
      return [];
    }
  }

  async findOne(id: string, currentUser?: User): Promise<any> {
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

    // Log para depuración
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`Role permissions type: ${typeof role.permissions}, value: ${JSON.stringify(role.permissions)}`);
    }

    // Convertir permisos de Record<string, any> a array de strings (solo los activos)
    let permissionsArray: string[] = [];
    
    // Parsear permissions si es un string JSON
    let permissionsObj: any = role.permissions;
    if (typeof role.permissions === 'string') {
      try {
        permissionsObj = JSON.parse(role.permissions);
      } catch (e) {
        this.logger.warn(`Failed to parse permissions for role ${id}:`, e);
        permissionsObj = null;
      }
    }
    
    if (permissionsObj && typeof permissionsObj === 'object' && !Array.isArray(permissionsObj)) {
      // Verificar si es formato agrupado (ej: { "users": ["create", "read"] })
      // o formato plano (ej: { "users.create": true, "users.read": true })
      const keys = Object.keys(permissionsObj);
      const isGroupedFormat = keys.some(key => Array.isArray(permissionsObj[key]));
      
      if (isGroupedFormat) {
        // Convertir formato agrupado a formato plano y luego a array
        // Ej: { "users": ["create", "read"] } -> ["users.create", "users.read"]
        for (const [module, actions] of Object.entries(permissionsObj)) {
          if (Array.isArray(actions)) {
            for (const action of actions) {
              if (typeof action === 'string') {
                permissionsArray.push(`${module}.${action}`);
              }
            }
          }
        }
      } else {
        // Formato plano: convertir a array de claves donde el valor es true
        permissionsArray = Object.keys(permissionsObj).filter(
          (key) => permissionsObj[key] === true || permissionsObj[key] === 'true'
        );
      }
    } else if (Array.isArray(permissionsObj)) {
      // Si ya es un array, usarlo directamente
      permissionsArray = permissionsObj.filter((p: any) => typeof p === 'string');
    }

    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`Converted permissions array: ${JSON.stringify(permissionsArray)}`);
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: permissionsArray,
      createdAt: role.created_at ? new Date(role.created_at).toISOString() : null,
      updatedAt: role.updated_at ? new Date(role.updated_at).toISOString() : null,
    };
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


