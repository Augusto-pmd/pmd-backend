import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { sanitizeObject, containsSuspiciousContent } from '../utils/sanitize.util';

@Injectable()
export class XssSanitizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const url = request.url || '';
    
    // Skip sanitization for health check endpoint
    if (url.includes('/health') || url.includes('/api/health')) {
      return next.handle();
    }
    
    try {
      // Sanitize request body
      if (request.body && typeof request.body === 'object') {
        const bodyString = JSON.stringify(request.body);
        if (containsSuspiciousContent(bodyString)) {
          // Log suspicious content but don't block (let validation handle it)
          console.warn('Suspicious content detected in request body');
        }
        request.body = sanitizeObject(request.body);
      }

      // NOTE: request.query and request.params are read-only in Express
      // They cannot be modified directly. Query params and route params
      // are typically validated by class-validator DTOs, which should handle
      // sanitization at the validation layer if needed.
      // 
      // If you need to sanitize query/params, do it in the controller or
      // use a custom validation pipe instead of trying to modify these
      // read-only properties here.
      
    } catch (error) {
      // If sanitization fails, log but don't block the request
      if (process.env.NODE_ENV === 'development') {
        console.warn('XSS sanitization error:', error);
      }
    }

    return next.handle().pipe(
      map((data) => {
        try {
          // Sanitize response data (optional, can be disabled for performance)
          // Only sanitize if it's a string or object
          if (typeof data === 'string') {
            return sanitizeObject(data);
          }
          if (typeof data === 'object' && data !== null) {
            // Don't sanitize binary data or large objects
            if (data.buffer || data.stream) {
              return data;
            }
            return sanitizeObject(data);
          }
          return data;
        } catch (error) {
          // If response sanitization fails, return original data
          if (process.env.NODE_ENV === 'development') {
            console.warn('Response sanitization error:', error);
          }
          return data;
        }
      }),
    );
  }
}

