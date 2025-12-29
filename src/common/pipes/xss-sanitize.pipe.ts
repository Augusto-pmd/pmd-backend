import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { sanitizeObject, containsSuspiciousContent } from '../utils/sanitize.util';

@Injectable()
export class XssSanitizePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): any {
    if (!value) {
      return value;
    }

    // Check for suspicious content before sanitizing
    const valueString = JSON.stringify(value);
    if (containsSuspiciousContent(valueString)) {
      throw new BadRequestException('Input contains potentially dangerous content');
    }

    // Sanitize the value
    return sanitizeObject(value);
  }
}

