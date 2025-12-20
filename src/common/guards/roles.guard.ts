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

    const userRole = user.role.name || user.role;

    // Map new role names to legacy enum values for compatibility
    // 'admin' is equivalent to DIRECTION/ADMINISTRATION
    const isAdmin = userRole === 'admin' || 
                    userRole === UserRole.DIRECTION || 
                    userRole === UserRole.ADMINISTRATION;

    // Direction/Administration/Admin have full access
    if (isAdmin) {
      return true;
    }

    // Check if this is a GET request (read operation)
    const isReadOperation = request.method === 'GET';
    
    // For read operations, allow 'auditor' role when DIRECTION/ADMINISTRATION is required
    if (isReadOperation && userRole === 'auditor') {
      const requiresAdmin = requiredRoles.some(role => 
        role === UserRole.DIRECTION || role === UserRole.ADMINISTRATION
      );
      if (requiresAdmin) {
        return true;
      }
    }

    // Convert required roles to strings for comparison
    const requiredRoleStrings = requiredRoles.map(role => String(role));

    // Check if user role matches any required role
    const roleMatches = requiredRoleStrings.some(required => {
      // Direct match
      if (required === userRole) {
        return true;
      }
      // Admin matches DIRECTION/ADMINISTRATION
      if ((required === UserRole.DIRECTION || required === UserRole.ADMINISTRATION) && isAdmin) {
        return true;
      }
      return false;
    });

    if (roleMatches) {
      return true;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}

