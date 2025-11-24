import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';
import { CashboxStatus } from '../../common/enums/cashbox-status.enum';

export class CreateCashboxDto {
  @IsUUID()
  user_id: string;

  @IsEnum(CashboxStatus)
  @IsOptional()
  status?: CashboxStatus;

  @IsNumber()
  @IsOptional()
  @Min(0)
  opening_balance_ars?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  opening_balance_usd?: number;

  @IsDateString()
  opening_date: string;
}

