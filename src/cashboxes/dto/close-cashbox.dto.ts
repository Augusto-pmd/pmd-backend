import {
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CloseCashboxDto {
  @ApiPropertyOptional({
    description: 'Closing balance in ARS',
    example: 9500.00,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  closing_balance_ars?: number;

  @ApiPropertyOptional({
    description: 'Closing balance in USD',
    example: 95.00,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  closing_balance_usd?: number;

  @ApiPropertyOptional({
    description: 'Closing date (ISO 8601 format). Defaults to current date if not provided.',
    example: '2024-01-16',
    type: String,
    format: 'date',
  })
  @IsDateString()
  @IsOptional()
  closing_date?: string;
}

