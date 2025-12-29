import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { BruteForceService } from '../services/brute-force.service';
import { Reflector } from '@nestjs/core';

/**
 * Decorator to skip brute force protection for specific endpoints
 */
export const SkipBruteForce = () => SetMetadata('skipBruteForce', true);

@Injectable()
export class BruteForceGuard implements CanActivate {
  constructor(
    private bruteForceService: BruteForceService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if brute force protection should be skipped
    const skipBruteForce = this.reflector.getAllAndOverride<boolean>('skipBruteForce', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipBruteForce) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const identifier = this.extractIdentifier(request);

    // Check if blocked
    if (this.bruteForceService.isBlocked(identifier)) {
      const remainingTime = this.bruteForceService.getRemainingBlockTime(identifier);
      const minutes = Math.ceil(remainingTime / 60000);

      throw new HttpException(
        {
          message: 'Too many failed login attempts. Please try again later.',
          code: 'BRUTE_FORCE_BLOCKED',
          remainingTime,
          remainingMinutes: minutes,
          retryAfter: new Date(Date.now() + remainingTime).toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Extract identifier from request (IP address)
   */
  private extractIdentifier(request: any): string {
    // Check x-forwarded-for header (first IP in chain)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)
        .split(',')
        .map((ip: string) => ip.trim());
      return ips[0] || 'unknown';
    }

    // Check x-real-ip header
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Use direct IP from request
    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}

