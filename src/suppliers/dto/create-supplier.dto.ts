import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierStatus } from '../../common/enums/supplier-status.enum';
import { SupplierType } from '../../common/enums/supplier-type.enum';
import { FiscalCondition } from '../../common/enums/fiscal-condition.enum';
import { IsCuit } from '../../common/validators/cuit.validator';

export class CreateSupplierDto {
  @ApiProperty({
    description: 'Supplier name',
    example: 'Proveedor S.A.',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'CUIT (Argentine tax ID) - Format: XX-XXXXXXXX-X',
    example: '20-12345678-9',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  @IsCuit({ message: 'CUIT must be a valid 11-digit CUIT number' })
  cuit?: string;

  @ApiPropertyOptional({
    description: 'Supplier email address',
    example: 'contacto@proveedor.com',
    maxLength: 255,
  })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    description: 'Supplier phone number',
    example: '+541112345678',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Contact person name',
    example: 'Juan Pérez',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  contact?: string;

  @ApiPropertyOptional({
    description: 'Supplier category',
    example: 'Materiales',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  category?: string;

  @ApiPropertyOptional({
    description: 'Supplier status',
    enum: SupplierStatus,
    example: SupplierStatus.PROVISIONAL,
    default: SupplierStatus.PROVISIONAL,
  })
  @IsEnum(SupplierStatus)
  @IsOptional()
  status?: SupplierStatus;

  @ApiPropertyOptional({
    description: 'Supplier address',
    example: 'Av. Corrientes 1234, Buenos Aires',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Supplier type',
    enum: SupplierType,
    example: SupplierType.MATERIALS,
  })
  @IsEnum(SupplierType)
  @IsOptional()
  type?: SupplierType;

  @ApiPropertyOptional({
    description:
      'Weekly base payment reference (only for suppliers with type=contractor).',
    example: 50000,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  weekly_payment?: number;

  @ApiPropertyOptional({
    description:
      'Total budget for contractor certifications (only for suppliers with type=contractor).',
    example: 1000000,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  contractor_budget?: number;

  @ApiPropertyOptional({
    description: 'Fiscal condition of the supplier',
    enum: FiscalCondition,
    example: FiscalCondition.RI,
  })
  @IsEnum(FiscalCondition)
  @IsOptional()
  fiscal_condition?: FiscalCondition;

  @ApiPropertyOptional({
    description: 'User UUID who created the supplier (for provisional suppliers)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  created_by_id?: string;
}

