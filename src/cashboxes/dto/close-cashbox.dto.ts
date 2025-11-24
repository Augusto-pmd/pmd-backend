import {
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';

export class CloseCashboxDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  closing_balance_ars?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  closing_balance_usd?: number;

  @IsDateString()
  @IsOptional()
  closing_date?: string;
}

