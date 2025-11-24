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
          });

          await this.auditLogRepository.save(auditLog);
        } catch (error) {
          // Don't fail the request if audit logging fails
          console.error('Audit logging failed:', error);
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

  private sanitizeData(data: any): any {
    if (!data) return null;
    if (typeof data !== 'object') return data;

    const sanitized = { ...data };
    // Remove sensitive fields
    if (sanitized.password) delete sanitized.password;
    if (sanitized.token) delete sanitized.token;
    if (sanitized.refreshToken) delete sanitized.refreshToken;

    return sanitized;
  }
}

