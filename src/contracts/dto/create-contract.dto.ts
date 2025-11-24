import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { Currency } from '../../common/enums/currency.enum';

export class CreateContractDto {
  @IsUUID()
  work_id: string;

  @IsUUID()
  supplier_id: string;

  @IsUUID()
  rubric_id: string;

  @IsNumber()
  @Min(0)
  amount_total: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  amount_executed?: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  file_url?: string;

  @IsString()
  @IsOptional()
  payment_terms?: string;

  @IsDateString()
  @IsOptional()
  start_date?: string;

  @IsDateString()
  @IsOptional()
  end_date?: string;
}

