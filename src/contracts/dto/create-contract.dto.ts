import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../../common/enums/currency.enum';

export class CreateContractDto {
  @ApiProperty({
    description: 'Work UUID (mandatory)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  work_id: string;

  @ApiProperty({
    description: 'Supplier UUID (mandatory)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  supplier_id: string;

  @ApiProperty({
    description: 'Rubric/Category UUID (mandatory)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  rubric_id: string;

  @ApiProperty({
    description: 'Total contract amount',
    example: 100000.50,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @Min(0)
  amount_total: number;

  @ApiPropertyOptional({
    description: 'Executed amount (defaults to 0)',
    example: 0,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  amount_executed?: number;

  @ApiProperty({
    description: 'Currency',
    enum: Currency,
    example: Currency.ARS,
  })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional({
    description: 'File URL for contract document',
    example: 'https://drive.google.com/file/...',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  file_url?: string;

  @ApiPropertyOptional({
    description: 'Payment terms',
    example: 'Net 30 days',
  })
  @IsString()
  @IsOptional()
  payment_terms?: string;

  @ApiPropertyOptional({
    description: 'Contract start date (ISO 8601 format)',
    example: '2024-01-15',
    type: String,
    format: 'date',
  })
  @IsDateString()
  @IsOptional()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Contract end date (ISO 8601 format). Must be after start_date if both are provided.',
    example: '2024-12-31',
    type: String,
    format: 'date',
  })
  @IsDateString()
  @IsOptional()
  @ValidateIf((o) => o.end_date && o.start_date)
  end_date?: string;
}

