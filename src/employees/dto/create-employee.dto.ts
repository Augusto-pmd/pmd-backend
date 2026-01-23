import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsNumber,
  Min,
  MaxLength,
  IsDateString,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeTrade } from '../../common/enums/employee-trade.enum';

export class CreateEmployeeDto {
  @ApiProperty({
    description: 'Employee full name',
    example: 'Juan Pérez',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  fullName: string;

  @ApiPropertyOptional({
    description: 'Employee email',
    example: 'juan@example.com',
    maxLength: 255,
  })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    description: 'Employee phone',
    example: '+541112345678',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Daily salary (salario diario)',
    example: 15000.5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  daily_salary?: number;

  @ApiPropertyOptional({
    description: 'Trade / rubro',
    enum: EmployeeTrade,
  })
  @IsEnum(EmployeeTrade)
  @IsOptional()
  trade?: EmployeeTrade;

  @ApiPropertyOptional({
    description: 'Work (obra) UUID',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  work_id?: string;

  @ApiPropertyOptional({
    description: 'Area',
    example: 'Construcción',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  area?: string;

  @ApiPropertyOptional({
    description: 'Position / puesto',
    example: 'Oficial',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  position?: string;

  @ApiPropertyOptional({
    description: 'Role (job role)',
    example: 'Operario',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  role?: string;

  @ApiPropertyOptional({
    description: 'Subrole',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  subrole?: string;

  @ApiPropertyOptional({
    description: 'Hire date',
    example: '2024-01-15',
  })
  @IsDateString()
  @IsOptional()
  hireDate?: string;

  @ApiPropertyOptional({
    description: 'Insurance / seguro (e.g. expiration)',
  })
  @IsObject()
  @IsOptional()
  seguro?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
