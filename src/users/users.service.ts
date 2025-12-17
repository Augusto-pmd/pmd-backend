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
import { normalizeUser } from '../common/helpers/normalize-user.helper';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  /**
   * Normalizes a User entity using the shared helper
   * This ensures consistency across all endpoints
   */
  private normalizeUserEntity(u: User): any {
    return normalizeUser(u);
  }

  /**
   * Reloads a user with fresh relations after save operations
   * Ensures that role and organization are always up-to-date
   */
  private async reloadUserWithRelations(id: string | number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: String(id) },
      relations: ['role', 'organization'],
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found after save`);
    }

    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<any> {
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

    const savedUser = await this.userRepository.save(user);

    // Reload with relations to ensure role and organization are loaded
    const userWithRelations = await this.reloadUserWithRelations(savedUser.id);

    // Use the same normalizer as all other endpoints for consistency
    return this.normalizeUserEntity(userWithRelations);
  }

  async findAll(user?: User): Promise<any[]> {
    try {
      const organizationId = user ? getOrganizationId(user) : null;
      const where: any = {};
      
      if (organizationId) {
        where.organization_id = organizationId;
      }

      // Load users with relations - ALWAYS load both role and organization
      const users = await this.userRepository.find({
        where,
        relations: ['role', 'organization'],
      });

      // Normalize all users using consistent normalizer
      return users.map((u) => this.normalizeUserEntity(u));
    } catch (error) {
      console.error('[UsersService.findAll] Error:', error);
      return [];
    }
  }

  /**
   * Internal method to get User entity (not normalized)
   * Used by update, remove, updateRole methods that need the actual entity
   */
  private async findOneEntity(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: String(id) },
      relations: ['role', 'organization'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findOne(id: string): Promise<any> {
    const user = await this.findOneEntity(id);
    // ALWAYS return normalized version for consistency
    return this.normalizeUserEntity(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<any> {
    const user = await this.findOneEntity(id);

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    const savedUser = await this.userRepository.save(user);

    // Reload with fresh relations to ensure role and organization are up-to-date
    const refreshedUser = await this.reloadUserWithRelations(savedUser.id);

    // Return normalized version for consistency
    return this.normalizeUserEntity(refreshedUser);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOneEntity(id);
    await this.userRepository.remove(user);
  }

  async updateRole(id: string, roleId: string): Promise<any> {
    const user = await this.findOneEntity(id);
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    user.role = role;
    const savedUser = await this.userRepository.save(user);

    // Reload with fresh relations to ensure role is properly loaded
    const refreshedUser = await this.reloadUserWithRelations(savedUser.id);

    // Return normalized version for consistency
    return this.normalizeUserEntity(refreshedUser);
  }
}

