import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateContractorCertificationDto {
  @ApiPropertyOptional({
    description: 'Week start date (Monday) for the certification',
    example: '2026-01-19',
    type: String,
    format: 'date',
  })
  @IsDateString()
  @IsOptional()
  week_start_date?: string;

  @ApiPropertyOptional({
    description: 'Certified amount for the week',
    example: 250000,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({
    description: 'Optional description',
    example: 'Ajuste por materiales adicionales',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Optional contract UUID to associate this certification',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  contract_id?: string | null;
}

