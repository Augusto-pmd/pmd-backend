import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { CsrfService } from '../services/csrf.service';
import { Reflector } from '@nestjs/core';

/**
 * Decorator to skip CSRF validation for specific endpoints
 */
export const SkipCsrf = () => SetMetadata('skipCsrf', true);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private csrfService: CsrfService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const path = request.url || request.path || '';

    // Skip CSRF validation for all API routes (JWT provides sufficient protection)
    if (path.startsWith('/api/')) {
      return true;
    }

    // Check if CSRF validation should be skipped
    const skipCsrf = this.reflector.getAllAndOverride<boolean>('skipCsrf', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCsrf) {
      return true;
    }

    const method = request.method;

    // Only validate CSRF for state-changing methods
    const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!stateChangingMethods.includes(method)) {
      return true;
    }

    // Get CSRF token from header (case-insensitive)
    const csrfToken = request.headers['x-csrf-token'] || 
                      request.headers['X-CSRF-Token'] ||
                      request.headers['csrf-token'];
    
    if (!csrfToken) {
      throw new ForbiddenException('CSRF token missing');
    }

    // Get session identifier (user ID from JWT if available)
    const user = request.user;
    const sessionId = user?.id || 'anonymous';

    // Validate token
    const isValid = this.csrfService.validateToken(csrfToken, sessionId);

    if (!isValid) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}

