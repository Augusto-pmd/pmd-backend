import {
  IsNumber,
  IsEnum,
  IsString,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../../common/enums/currency.enum';

export class RefillCashboxDto {
  @ApiProperty({
    description: 'Refill amount',
    example: 5000.00,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Currency for the refill',
    enum: Currency,
    example: Currency.ARS,
  })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional({
    description: 'Person who delivered the money (optional)',
    example: 'Juan Pérez',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  delivered_by?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the refill',
    example: 'Refuerzo para compra de materiales',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

