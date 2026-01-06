import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { JwtUserPayload } from '../interfaces/jwt-user-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'supersecret123'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUserPayload> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: ['role', 'organization'],
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Extract organizationId from user.organization.id or payload
    const organizationId = user.organization?.id ?? payload.organizationId ?? null;

    // Extract role permissions and convert to flat array of strings
    // Permissions structure: { "users": ["create", "read"], "expenses": ["create"] }
    // Expected output: ["users.create", "users.read", "expenses.create"]
    let rolePermissions: string[] = [];
    
    if (user.role?.permissions) {
      if (Array.isArray(user.role.permissions)) {
        // Already an array
        rolePermissions = user.role.permissions;
      } else if (typeof user.role.permissions === 'object') {
        // Convert object to flat array: { "module": ["action1", "action2"] } -> ["module.action1", "module.action2"]
        rolePermissions = Object.entries(user.role.permissions).reduce((acc: string[], [module, actions]) => {
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

    // 🔒 SEGURIDAD: Filtrar permisos incorrectos según el rol
    // Administration NO debe tener acceso a users, roles, audit
    // Supervisor NO debe tener acceso a users, roles, audit, accounting
    const roleName = user.role?.name?.toLowerCase();
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
        console.warn(`[JWT_STRATEGY] ⚠️ WARNING: Removed ${removedCount} forbidden permission(s) for role "${roleName}":`, removedPermissions);
      }
    }

    // Return user object in the exact format expected by the frontend
    // Include all necessary fields for authenticated endpoints
    // Use role from database (with permissions) instead of payload.role
    return {
      id: payload.sub,
      email: payload.email,
      fullName: user.fullName,
      role: user.role ? {
        id: user.role.id,
        name: user.role.name,
        permissions: rolePermissions,
      } : payload.role,
      organizationId: organizationId,
      organization: user.organization
        ? {
            id: user.organization?.id ?? null,
            name: user.organization?.name ?? null,
          }
        : null,
    };
  }
}

