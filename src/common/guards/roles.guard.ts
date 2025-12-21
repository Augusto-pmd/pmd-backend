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
      throw new ForbiddenException('User role not found');
    }

    // Normalize role to lowercase string and validate it's a valid enum value
    const userRoleRaw = user.role?.name || user.role;
    const userRoleNormalized = String(userRoleRaw).toLowerCase();
    
    // Validate that the normalized role is a valid UserRole enum value
    // Object.values(UserRole) returns UserRole[] for string enums
    const validRoles: readonly UserRole[] = Object.values(UserRole);
    if (!validRoles.includes(userRoleNormalized as UserRole)) {
      throw new ForbiddenException('Invalid user role');
    }
    
    // Type assertion is safe here because we validated above
    const userRole: UserRole = userRoleNormalized as UserRole;

    // Direction has full access
    if (userRole === UserRole.DIRECTION) {
      return true;
    }

    // Check if user role is in required roles
    if (requiredRoles.includes(userRole)) {
      return true;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}

