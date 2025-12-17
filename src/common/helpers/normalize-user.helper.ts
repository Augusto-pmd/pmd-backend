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
  // Extract role permissions and convert to flat array of strings
  // Permissions structure: { "users": ["create", "read"], "expenses": ["create"] }
  // Expected output: ["users.create", "users.read", "expenses.create"]
  let rolePermissions: string[] = [];
  
  if (u.role?.permissions) {
    if (Array.isArray(u.role.permissions)) {
      // Already an array
      rolePermissions = u.role.permissions;
    } else if (typeof u.role.permissions === 'object') {
      // Convert object to flat array: { "module": ["action1", "action2"] } -> ["module.action1", "module.action2"]
      rolePermissions = Object.entries(u.role.permissions).reduce((acc: string[], [module, actions]) => {
        if (Array.isArray(actions)) {
          // If actions is an array, create "module.action" strings
          const modulePermissions = actions.map((action: string) => `${module}.${action}`);
          acc.push(...modulePermissions);
        } else if (typeof actions === 'boolean' && actions === true) {
          // Legacy format: { "module": true } -> ["module"]
          acc.push(module);
        } else if (typeof actions === 'object' && actions !== null) {
          // Nested object: { "module": { "action": true } } -> ["module.action"]
          const nestedPermissions = Object.keys(actions).filter(k => actions[k] === true);
          nestedPermissions.forEach(action => acc.push(`${module}.${action}`));
        }
        return acc;
      }, []);
    }
  }
  
  // Log conversion for audit
  console.log(`[NORMALIZE_USER] Original permissions type: ${typeof u.role?.permissions}, Converted length: ${rolePermissions.length}`);

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
          permissions: rolePermissions,
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

