import {
  IsDateString,
  IsNumber,
  IsPositive,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExchangeRateDto {
  @ApiProperty({
    description: 'Date for the exchange rate (YYYY-MM-DD)',
    example: '2024-01-15',
    type: String,
    format: 'date',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Exchange rate from ARS to USD',
    example: 0.0012,
    type: Number,
    minimum: 0.0001,
    maximum: 1,
  })
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  @Min(0.0001)
  @Max(1)
  rate_ars_to_usd: number;

  @ApiProperty({
    description: 'Exchange rate from USD to ARS',
    example: 850.5,
    type: Number,
    minimum: 1,
  })
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  @Min(1)
  rate_usd_to_ars: number;
}

