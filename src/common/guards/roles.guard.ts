import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No roles required, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('Rol de usuario no encontrado');
    }

    // Normalize role to lowercase string and validate it's a valid enum value
    // Handle both object format { id, name, permissions } and string format
    const userRoleRaw = typeof user.role === 'object' && user.role !== null 
      ? user.role.name 
      : user.role;
    const userRoleNormalized = String(userRoleRaw).toLowerCase();
    
    // Validate that the normalized role is a valid UserRole enum value
    // Object.values(UserRole) returns UserRole[] for string enums
    const validRoles: readonly UserRole[] = Object.values(UserRole);
    if (!validRoles.includes(userRoleNormalized as UserRole)) {
      throw new ForbiddenException('Rol de usuario inválido');
    }
    
    // Type assertion is safe here because we validated above
    const userRole: UserRole = userRoleNormalized as UserRole;

    // Check if user has admin privileges (DIRECTION or ADMINISTRATION)
    const isAdmin = userRole === UserRole.DIRECTION || 
                    userRole === UserRole.ADMINISTRATION;

    // Direction/Administration/Admin have full access
    if (isAdmin) {
      return true;
    }

    // Check if this is a GET request (read operation)
    const isReadOperation = request.method === 'GET';
    
    // Note: 'auditor' role is not currently in the UserRole enum
    // If needed in the future, add it to the enum and uncomment this section

    // Convert required roles to lowercase strings for comparison
    const requiredRoleStrings = requiredRoles.map(role => String(role).toLowerCase());

    // Check if user role matches any required role
    const roleMatches = requiredRoleStrings.some(required => {
      // Direct match (both normalized to lowercase)
      if (required === userRole) {
        return true;
      }
      // Admin matches DIRECTION/ADMINISTRATION
      const requiredNormalized = required.toLowerCase();
      if ((requiredNormalized === UserRole.DIRECTION || requiredNormalized === UserRole.ADMINISTRATION) && isAdmin) {
        return true;
      }
      return false;
    });

    if (roleMatches) {
      return true;
    }

    throw new ForbiddenException('Permisos insuficientes');
  }
}

