import {
  IsString,
  IsEnum,
  IsUUID,
  IsOptional,
  IsDateString,
  IsNumber,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../../common/enums/currency.enum';
import { WorkStatus } from '../../common/enums/work-status.enum';
import { WorkType } from '../../common/enums/work-type.enum';

export class CreateWorkDto {
  @ApiProperty({
    description: 'Work name',
    example: 'Construcción Edificio A',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Client name',
    example: 'Empresa Constructora S.A.',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  client: string;

  @ApiProperty({
    description: 'Work address',
    example: 'Av. Corrientes 1234, Buenos Aires',
  })
  @IsString()
  address: string;

  @ApiProperty({
    description: 'Work start date (ISO 8601 format)',
    example: '2024-01-15',
    type: String,
    format: 'date',
  })
  @IsDateString()
  start_date: string;

  @ApiPropertyOptional({
    description: 'Work end date (ISO 8601 format). Must be after start_date if provided.',
    example: '2024-12-31',
    type: String,
    format: 'date',
  })
  @IsDateString()
  @IsOptional()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Work status',
    enum: WorkStatus,
    example: WorkStatus.ACTIVE,
  })
  @IsEnum(WorkStatus)
  @IsOptional()
  status?: WorkStatus;

  @ApiProperty({
    description: 'Currency for the work',
    enum: Currency,
    example: Currency.ARS,
  })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional({
    description: 'Work type',
    enum: WorkType,
    example: WorkType.HOUSE,
  })
  @IsEnum(WorkType)
  @IsOptional()
  work_type?: WorkType;

  @ApiPropertyOptional({
    description: 'Supervisor user UUID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  supervisor_id?: string;

  @ApiPropertyOptional({
    description: 'Total budget for the work',
    example: 1000000.00,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  total_budget?: number;
}

