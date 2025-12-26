import { IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../../common/enums/currency.enum';

export class ManualAdjustmentDto {
  @ApiProperty({
    description: 'Adjustment amount (can be positive or negative)',
    example: -500.00,
    type: Number,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Currency for the adjustment',
    enum: Currency,
    example: Currency.ARS,
  })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional({
    description: 'Reason for the manual adjustment',
    example: 'Ajuste por error en conteo de efectivo',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

