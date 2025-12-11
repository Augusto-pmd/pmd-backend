import { User } from '../../users/user.entity';

/**
 * Normalizes a User entity to the canonical UserAPI contract
 * This ensures ALL endpoints return the exact same user structure
 * 
 * UserAPI {
 *   id: string | number;
 *   email: string;
 *   fullName: string;
 *   isActive: boolean;
 *   role: { id, name, description?, permissions? } | null;
 *   roleId: string | number | null;
 *   organizationId: string | number | null;
 *   organization: { id, name } | null;
 *   created_at?: Date | string;
 *   updated_at?: Date | string;
 * }
 */
export function normalizeUser(u: User): any {
  // Extract role permissions if available
  const rolePermissions = u.role?.permissions 
    ? (Array.isArray(u.role.permissions) 
        ? u.role.permissions 
        : typeof u.role.permissions === 'object' 
          ? Object.keys(u.role.permissions).filter(k => u.role.permissions[k] === true)
          : [])
    : undefined;

  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    isActive: u.isActive,
    role: u.role 
      ? {
          id: u.role.id,
          name: u.role.name,
          ...(u.role.description ? { description: u.role.description } : {}),
          ...(rolePermissions && rolePermissions.length > 0 ? { permissions: rolePermissions } : {}),
        }
      : null,
    roleId: u.role?.id ?? null,
    organizationId: u.organizationId ?? u.organization?.id ?? null,
    organization: u.organization
      ? { id: u.organization.id, name: u.organization.name }
      : null,
    ...(u.created_at ? { created_at: u.created_at } : {}),
    ...(u.updated_at ? { updated_at: u.updated_at } : {}),
  };
}

