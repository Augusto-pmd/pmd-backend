import { IsOptional, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiQuery } from '@nestjs/swagger';
import { CashMovementType } from '../../common/enums/cash-movement-type.enum';
import { Currency } from '../../common/enums/currency.enum';

export class GetHistoryDto {
  @ApiPropertyOptional({
    description: 'Page number (starts at 1)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by movement type',
    enum: CashMovementType,
    example: CashMovementType.REFILL,
  })
  @IsOptional()
  @IsEnum(CashMovementType)
  type?: CashMovementType;

  @ApiPropertyOptional({
    description: 'Filter by currency',
    enum: Currency,
    example: Currency.ARS,
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({
    description: 'Start date for date range filter (ISO 8601)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for date range filter (ISO 8601)',
    example: '2024-01-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

