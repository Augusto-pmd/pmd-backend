import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsCuitConstraint implements ValidatorConstraintInterface {
  validate(cuit: string, args: ValidationArguments): boolean {
    if (!cuit) return true; // Optional field, allow empty
    // Remove dashes and spaces
    const cleanCuit = cuit.replace(/[-\s]/g, '');
    // CUIT should be 11 digits
    if (!/^\d{11}$/.test(cleanCuit)) return false;
    // Validate CUIT checksum (simplified validation)
    return this.validateCuitChecksum(cleanCuit);
  }

  defaultMessage(args: ValidationArguments): string {
    return 'CUIT must be a valid 11-digit CUIT number';
  }

  private validateCuitChecksum(cuit: string): boolean {
    // Simplified CUIT validation - checksum algorithm
    const digits = cuit.split('').map(Number);
    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += digits[i] * multipliers[i];
    }
    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? remainder : 11 - remainder;
    return checkDigit === digits[10];
  }
}

export function IsCuit(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCuitConstraint,
    });
  };
}

