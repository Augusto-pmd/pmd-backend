/**
 * Test helper utilities for PMD Management System tests
 */

import { User } from '../../users/user.entity';
import { Role } from '../../roles/role.entity';
import { UserRole } from '../enums/user-role.enum';

export const createMockUser = (overrides?: any): User => {
  const defaultRole = new Role();
  defaultRole.id = 'role-id';
  defaultRole.name = UserRole.DIRECTION;
  defaultRole.description = 'Test role';
  defaultRole.permissions = [];
  defaultRole.created_at = new Date();
  defaultRole.updated_at = new Date();

  // If overrides contains a partial role, merge it with default role
  let role = defaultRole;
  if (overrides?.role) {
    if (overrides.role instanceof Role) {
      role = overrides.role;
    } else {
      // Merge partial role properties
      role = Object.assign(new Role(), defaultRole, overrides.role);
      if (!role.id) role.id = 'role-id';
      if (!role.description) role.description = 'Test role';
      if (!role.permissions) role.permissions = [];
      if (!role.created_at) role.created_at = new Date();
      if (!role.updated_at) role.updated_at = new Date();
    }
  }

  const user = new User();
  user.id = overrides?.id || 'user-id';
  user.fullName = overrides?.fullName || 'Test User';
  user.email = overrides?.email || 'test@example.com';
  user.password = 'hashedPassword';
  user.isActive = overrides?.isActive !== undefined ? overrides.isActive : true;
  user.role = role;
  user.created_at = new Date();
  user.updated_at = new Date();

  // Apply other overrides but preserve the role we just set
  const { role: _, ...otherOverrides } = overrides || {};
  return { ...user, ...otherOverrides, role };
};

export const createMockRole = (overrides?: Partial<Role>): Role => {
  const role = new Role();
  role.id = overrides?.id || 'role-id';
  role.name = overrides?.name || UserRole.DIRECTION;
  role.description = overrides?.description || 'Test role';
  role.created_at = new Date();
  role.updated_at = new Date();

  return { ...role, ...overrides };
};

export const createMockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getRawOne: jest.fn(),
    select: jest.fn().mockReturnThis(),
  })),
});

