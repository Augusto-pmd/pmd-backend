import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Role } from '../roles/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';
import { getDefaultRole } from '../common/helpers/get-default-role.helper';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const role = await this.roleRepository.findOne({
      where: { id: createUserDto.role_id },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${createUserDto.role_id} not found`);
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return await this.userRepository.save(user);
  }

  async findAll(user?: User): Promise<any[]> {
    const organizationId = user ? getOrganizationId(user) : null;
    const where: any = {};
    
    if (organizationId) {
      where.organization_id = organizationId;
    }

    // Load users with relations
    const users = await this.userRepository.find({
      where,
      relations: ['role', 'organization'],
    });

    // Get default role and organization for fallbacks
    const defaultRole = await getDefaultRole(this.roleRepository);
    const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

    // Normalize all users to prevent 500 errors
    return users.map((u) => {
      // Normalize role - ensure it's always an object with id and name
      let role = defaultRole;
      let roleId = defaultRole.id;

      if (u.role && u.role.id && u.role.name) {
        role = {
          id: u.role.id,
          name: u.role.name,
        };
        roleId = u.role.id;
      }

      // Normalize organizationId
      const userOrgId = getOrganizationId(u) || DEFAULT_ORG_ID;

      // Normalize organization object
      let organization = {
        id: DEFAULT_ORG_ID,
        name: 'PMD Arquitectura',
      };

      if (u.organization && u.organization.id && u.organization.name) {
        organization = {
          id: u.organization.id,
          name: u.organization.name,
        };
      }

      // Return normalized user object
      return {
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: role,
        roleId: roleId,
        organizationId: userOrgId,
        organization: organization,
        isActive: u.isActive,
        created_at: u.created_at,
        updated_at: u.updated_at,
      };
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  async updateRole(id: string, roleId: string): Promise<User> {
    const user = await this.findOne(id);
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    user.role = role;
    return await this.userRepository.save(user);
  }
}

