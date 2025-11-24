import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { Currency } from '../../common/enums/currency.enum';
import { CashMovementType } from '../../common/enums/cash-movement-type.enum';

export class CreateCashMovementDto {
  @IsUUID()
  cashbox_id: string;

  @IsEnum(CashMovementType)
  type: CashMovementType;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsUUID()
  @IsOptional()
  expense_id?: string;

  @IsUUID()
  @IsOptional()
  income_id?: string;

  @IsDateString()
  date: string;
}

