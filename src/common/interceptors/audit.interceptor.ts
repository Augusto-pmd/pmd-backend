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
    
    // Extract IP address (handle proxy headers)
    const ipAddress = this.extractIpAddress(ip, headers);
    
    // Extract user agent
    const userAgent = headers['user-agent'] || headers['useragent'] || 'unknown';

    // Determine criticality based on action
    const criticality = this.getCriticality(method, module);

    // Skip logging for GET requests (low criticality, too many logs)
    if (method === 'GET' && criticality === 'low') {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const organizationId = user?.organizationId ?? user?.organization?.id ?? null;
          
          // Determine previous_value and new_value based on HTTP method
          const { previousValue, newValue } = this.getAuditValues(method, body, response);

          const auditLog = this.auditLogRepository.create({
            user_id: user?.id || null,
            action,
            module,
            entity_id: entityId,
            entity_type: entityType,
            previous_value: previousValue,
            new_value: newValue,
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

  /**
   * Extract IP address from request, handling proxy headers
   */
  private extractIpAddress(ip: string | undefined, headers: Record<string, any>): string {
    // Check x-forwarded-for header (first IP in chain)
    const forwardedFor = headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = forwardedFor.split(',').map((ip: string) => ip.trim());
      return ips[0] || 'unknown';
    }

    // Check x-real-ip header
    const realIp = headers['x-real-ip'];
    if (realIp) {
      return realIp;
    }

    // Use direct IP from request
    return ip || 'unknown';
  }

  /**
   * Get previous and new values for audit log based on HTTP method
   * Business Rule: Capture previous value before update, new value after
   */
  private getAuditValues(
    method: string,
    body: any,
    response: any,
  ): { previousValue: any; newValue: any } {
    switch (method) {
      case 'POST':
        // CREATE: no previous value, new value is the created entity
        return {
          previousValue: null,
          newValue: this.sanitizeData(response),
        };

      case 'PUT':
      case 'PATCH':
        // UPDATE: previous value is the body (data sent), new value is the updated entity
        // Note: For a complete previous value, we'd need to fetch the entity before update
        // This is a limitation, but we capture what was sent vs what was saved
        return {
          previousValue: this.sanitizeData(body),
          newValue: this.sanitizeData(response),
        };

      case 'DELETE':
        // DELETE: previous value is the deleted entity, new value is null
        return {
          previousValue: this.sanitizeData(response),
          newValue: null,
        };

      default:
        // GET and others: minimal logging
        return {
          previousValue: null,
          newValue: this.sanitizeData(response),
        };
    }
  }

  private getCriticality(method: string, module: string): string {
    if (method === 'DELETE') return 'high';
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      if (['users', 'roles', 'accounting', 'cashboxes', 'contracts'].includes(module)) return 'high';
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

