import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CashboxStatus } from '../../common/enums/cashbox-status.enum';

export class CreateCashboxDto {
  @ApiPropertyOptional({
    description: 'User UUID (defaults to authenticated user)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  user_id?: string;

  @ApiPropertyOptional({
    description: 'Cashbox status',
    enum: CashboxStatus,
    example: CashboxStatus.OPEN,
    default: CashboxStatus.OPEN,
  })
  @IsEnum(CashboxStatus)
  @IsOptional()
  status?: CashboxStatus;

  @ApiPropertyOptional({
    description: 'Opening balance in ARS',
    example: 10000.00,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  opening_balance_ars?: number;

  @ApiPropertyOptional({
    description: 'Opening balance in USD',
    example: 100.00,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  opening_balance_usd?: number;

  @ApiProperty({
    description: 'Opening date (ISO 8601 format)',
    example: '2024-01-15',
    type: String,
    format: 'date',
  })
  @IsDateString()
  opening_date: string;
}

