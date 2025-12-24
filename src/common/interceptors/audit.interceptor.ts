import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../audit/audit.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, params, query, user, ip, headers } = request;

    const action = `${method} ${url}`;
    const module = url.split('/')[1] || 'unknown';
    const entityId = params?.id || body?.id || null;
    const entityType = this.getEntityType(url);
    const ipAddress = ip || headers['x-forwarded-for'] || 'unknown';
    const userAgent = headers['user-agent'] || 'unknown';

    // Determine criticality based on action
    const criticality = this.getCriticality(method, module);

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const organizationId = user?.organizationId ?? user?.organization?.id ?? null;
          const auditLog = this.auditLogRepository.create({
            user_id: user?.id || null,
            action,
            module,
            entity_id: entityId,
            entity_type: entityType,
            previous_value: this.sanitizeData(body),
            new_value: this.sanitizeData(response),
            ip_address: ipAddress,
            user_agent: userAgent,
            criticality,
            // Store organizationId in metadata if audit entity supports it
            ...(organizationId && { metadata: { organizationId } }),
          });

          await this.auditLogRepository.save(auditLog);
        } catch (error) {
          // Don't fail the request if audit logging fails
          if (process.env.NODE_ENV === 'development') {
            console.error('Audit logging failed:', error);
          }
        }
      }),
    );
  }

  private getEntityType(url: string): string {
    const parts = url.split('/').filter(Boolean);
    return parts[0] || 'unknown';
  }

  private getCriticality(method: string, module: string): string {
    if (method === 'DELETE') return 'high';
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      if (['users', 'roles', 'accounting'].includes(module)) return 'high';
      return 'medium';
    }
    return 'low';
  }

  /**
   * Sanitize data by removing sensitive fields before storing in audit log
   * Handles various data types: objects, arrays, primitives, null, undefined
   * 
   * @param data - Data to sanitize (can be any type)
   * @returns Sanitized data with sensitive fields removed, or original value if not an object
   */
  private sanitizeData(data: unknown): unknown {
    // Handle null, undefined, or falsy values
    if (!data) return null;
    
    // Handle primitives (string, number, boolean, etc.)
    if (typeof data !== 'object') return data;
    
    // Handle arrays - sanitize each element
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }
    
    // Handle objects - remove sensitive fields
    const sanitized = { ...(data as Record<string, unknown>) };
    
    // Remove sensitive fields
    if ('password' in sanitized) delete sanitized.password;
    if ('token' in sanitized) delete sanitized.token;
    if ('refreshToken' in sanitized) delete sanitized.refreshToken;
    if ('access_token' in sanitized) delete sanitized.access_token;
    if ('refresh_token' in sanitized) delete sanitized.refresh_token;
    
    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }
}

