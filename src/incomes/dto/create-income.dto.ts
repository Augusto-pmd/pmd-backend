import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../../common/enums/currency.enum';
import { IncomeType } from '../../common/enums/income-type.enum';

export class CreateIncomeDto {
  @ApiProperty({
    description: 'Work UUID (mandatory)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  work_id: string;

  @ApiProperty({
    description: 'Income type',
    enum: IncomeType,
    example: IncomeType.PROGRESS_PAYMENT,
  })
  @IsEnum(IncomeType)
  type: IncomeType;

  @ApiProperty({
    description: 'Income amount',
    example: 50000.00,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Currency',
    enum: Currency,
    example: Currency.ARS,
  })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({
    description: 'Income date (ISO 8601 format)',
    example: '2024-01-15',
    type: String,
    format: 'date',
  })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    description: 'File URL for attached document',
    example: 'https://drive.google.com/file/...',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  file_url?: string;

  @ApiPropertyOptional({
    description: 'Document number',
    example: 'INV-001',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  document_number?: string;

  @ApiPropertyOptional({
    description: 'Whether the income is validated (defaults to false)',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  is_validated?: boolean;

  @ApiPropertyOptional({
    description: 'Observations or notes',
    example: 'Payment received from client',
  })
  @IsString()
  @IsOptional()
  observations?: string;
}

