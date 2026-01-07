import { User } from '../../users/user.entity';
import { UserRole } from '../enums/user-role.enum';
import { NormalizedUser } from '../interfaces/normalized-user.interface';

/**
 * Fallback permissions map by role name
 * Used when role.permissions is empty or undefined in the database
 */
const ROLE_PERMISSIONS_FALLBACK: Record<string, string[]> = {
  [UserRole.ADMINISTRATION]: [
    'dashboard.read',
    'works.read',
    'works.create',
    'expenses.read',
    'expenses.validate',
    'suppliers.read',
    'suppliers.approve',
    'suppliers.reject',
    'contracts.read',
    'contracts.create',
    'contracts.update',
    'cashboxes.read',
    'cashboxes.update', // Puede actualizar movimientos de caja según cash-movements.controller.ts
    'cashboxes.approve',
    'accounting.read',
    'accounting.create',
    'accounting.update',
    'accounting.close',
    'documents.read',
    'documents.create',
    'documents.update',
    'alerts.read',
    'alerts.create',
    'alerts.update',
    'incomes.read',
    'incomes.create', // Puede cargar ingresos según documento maestro
    'settings.read',
    'schedule.read', // Solo consulta, no puede editar cronograma
    // Administration NO debe tener acceso a users, roles, audit según PERMISSIONS_MAPPING.md
  ],
  [UserRole.DIRECTION]: [
    'dashboard.read',
    'works.read',
    'works.create',
    'works.update',
    'works.delete',
    'expenses.read',
    'expenses.create',
    'expenses.update',
    'expenses.delete',
    'expenses.validate',
    'suppliers.read',
    'suppliers.create',
    'suppliers.update',
    'suppliers.delete',
    'suppliers.approve',
    'suppliers.reject',
    'contracts.read',
    'contracts.create',
    'contracts.update',
    'contracts.delete',
    'incomes.read',
    'incomes.create',
    'incomes.update',
    'incomes.delete',
    'cashboxes.read',
    'cashboxes.create',
    'cashboxes.update',
    'cashboxes.delete',
    'cashboxes.close',
    'cashboxes.approve',
    'accounting.read',
    'accounting.create',
    'accounting.update',
    'accounting.delete',
    'accounting.close',
    'accounting.reopen',
    'documents.read',
    'documents.create',
    'documents.update',
    'documents.delete',
    'alerts.read',
    'alerts.create',
    'alerts.update',
    'alerts.delete',
    'audit.read',
    'users.read',
    'users.create',
    'users.update',
    'users.delete',
    'roles.read',
    'roles.create',
    'roles.update',
    'roles.delete',
    'settings.read',
    'settings.update',
    'schedule.read',
    'schedule.create',
    'schedule.update',
    'schedule.delete',
  ],
  [UserRole.SUPERVISOR]: [
    'dashboard.read',
    'works.read',
    'works.create',
    'works.update',
    'expenses.read',
    'suppliers.read',
    'contracts.read',
    'cashboxes.read',
    'documents.read',
    'alerts.read',
    'incomes.read',
    'schedule.read',
    'schedule.update', // Puede marcar etapas como completadas
    // Supervisor NO debe tener acceso a accounting, users, roles, audit según PERMISSIONS_MAPPING.md
    // Supervisor solo puede leer, no crear ni modificar (excepto works.update para progreso y schedule.update para etapas)
  ],
  [UserRole.OPERATOR]: [
    'dashboard.read',
    'works.read',
    'expenses.read',
    'expenses.create',
    'suppliers.read',
    'suppliers.create',
    'cashboxes.read',
    'cashboxes.create',
    'cashboxes.close',
    'documents.read',
    'documents.create',
    'alerts.read',
    'schedule.read', // Solo consulta básica de cronogramas de obras asignadas
    // Operator NO debe tener acceso a accounting, contracts, incomes, users, roles, audit según PERMISSIONS_MAPPING.md
    // Operator solo puede acceder a sus propios recursos
  ],
};

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
export function normalizeUser(u: User): NormalizedUser {
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
  
  // 🔄 FALLBACK: Si permissions está vacío y existe un rol, usar permisos por defecto según el nombre del rol
  const originalPermissionsType = typeof u.role?.permissions;
  const originalPermissionsValue = u.role?.permissions;
  const hadEmptyPermissions = rolePermissions.length === 0;
  
  if (rolePermissions.length === 0 && u.role?.name) {
    const roleName = u.role.name.toLowerCase();
    const fallbackPermissions = ROLE_PERMISSIONS_FALLBACK[roleName];
    if (fallbackPermissions) {
      rolePermissions = fallbackPermissions;
      if (process.env.NODE_ENV === 'development') {
        console.log(`[NORMALIZE_USER] ✅ Using fallback permissions for role "${roleName}": ${rolePermissions.length} permissions`);
        console.log(`[NORMALIZE_USER] 📋 Fallback permissions:`, rolePermissions.slice(0, 10), rolePermissions.length > 10 ? '...' : '');
        // Verificar específicamente si users.read está presente
        const hasUsersRead = rolePermissions.includes('users.read');
        if (hasUsersRead) {
          console.warn(`[NORMALIZE_USER] ⚠️ WARNING: Fallback for "${roleName}" includes 'users.read' - this may be incorrect`);
        } else {
          console.log(`[NORMALIZE_USER] ✅ Confirmed: Fallback for "${roleName}" does NOT include 'users.read'`);
        }
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[NORMALIZE_USER] ⚠️ No fallback permissions found for role "${roleName}"`);
      }
    }
  }
  
  // 🔒 SEGURIDAD: Filtrar permisos incorrectos según el rol
  // Administration NO debe tener acceso a users, roles, audit
  // Supervisor NO debe tener acceso a users, roles, audit, accounting
  const roleName = u.role?.name?.toLowerCase();
  const forbiddenPermissions: string[] = [];
  
  if (roleName === UserRole.ADMINISTRATION.toLowerCase()) {
    // Administration NO debe tener: users.*, roles.*, audit.*
    forbiddenPermissions.push('users.read', 'users.create', 'users.update', 'users.delete');
    forbiddenPermissions.push('roles.read', 'roles.create', 'roles.update', 'roles.delete', 'roles.manage');
    forbiddenPermissions.push('audit.read', 'audit.create', 'audit.update', 'audit.delete');
  } else if (roleName === UserRole.SUPERVISOR.toLowerCase()) {
    // Supervisor NO debe tener: users.*, roles.*, audit.*, accounting.*
    forbiddenPermissions.push('users.read', 'users.create', 'users.update', 'users.delete');
    forbiddenPermissions.push('roles.read', 'roles.create', 'roles.update', 'roles.delete', 'roles.manage');
    forbiddenPermissions.push('audit.read', 'audit.create', 'audit.update', 'audit.delete');
    forbiddenPermissions.push('accounting.read', 'accounting.create', 'accounting.update', 'accounting.delete', 'accounting.close', 'accounting.reopen');
  }
  
  if (forbiddenPermissions.length > 0) {
    const originalCount = rolePermissions.length;
    const removedPermissions = rolePermissions.filter(perm => forbiddenPermissions.includes(perm));
    rolePermissions = rolePermissions.filter(perm => !forbiddenPermissions.includes(perm));
    const removedCount = originalCount - rolePermissions.length;
    if (removedCount > 0) {
      console.warn(`[NORMALIZE_USER] ⚠️ WARNING: Removed ${removedCount} forbidden permission(s) for role "${roleName}":`, removedPermissions);
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[NORMALIZE_USER] 🔒 Security filter applied: ${removedCount} permission(s) removed`);
      }
    }
  }

  // Log conversion for audit (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[NORMALIZE_USER] 📊 Summary for user ${u.email}:`);
    console.log(`  - Original permissions type: ${originalPermissionsType}`);
    console.log(`  - Original permissions value: ${JSON.stringify(originalPermissionsValue)}`);
    console.log(`  - Had empty permissions: ${hadEmptyPermissions}`);
    console.log(`  - Final permissions count: ${rolePermissions.length}`);
    console.log(`  - Role: ${u.role?.name}`);
    if (rolePermissions.length > 0) {
      console.log(`  - Sample permissions:`, rolePermissions.slice(0, 5));
    }
  }

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

