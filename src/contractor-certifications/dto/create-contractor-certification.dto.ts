import {
  IsUUID,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContractorCertificationDto {
  @ApiProperty({
    description: 'Supplier UUID (must be type=contractor)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  supplier_id: string;

  @ApiProperty({
    description: 'Week start date (Monday) for the certification',
    example: '2026-01-19',
    type: String,
    format: 'date',
  })
  @IsDateString()
  week_start_date: string;

  @ApiProperty({
    description: 'Certified amount for the week',
    example: 250000,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({
    description: 'Optional description',
    example: 'Avance de obra - semana 3',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description:
      'Optional contract UUID to associate this certification (recommended if supplier has multiple contracts)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  contract_id?: string;
}

