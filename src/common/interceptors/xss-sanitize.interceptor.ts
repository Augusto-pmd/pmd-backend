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
    
    // Sanitize request body
    if (request.body && typeof request.body === 'object') {
      const bodyString = JSON.stringify(request.body);
      if (containsSuspiciousContent(bodyString)) {
        // Log suspicious content but don't block (let validation handle it)
        console.warn('Suspicious content detected in request body');
      }
      request.body = sanitizeObject(request.body);
    }

    // Sanitize query parameters
    if (request.query && typeof request.query === 'object') {
      request.query = sanitizeObject(request.query);
    }

    // Sanitize route parameters
    if (request.params && typeof request.params === 'object') {
      request.params = sanitizeObject(request.params);
    }

    return next.handle().pipe(
      map((data) => {
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
      }),
    );
  }
}

