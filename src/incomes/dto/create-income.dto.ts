import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  MaxLength,
  Min,
} from 'class-validator';
import { Currency } from '../../common/enums/currency.enum';
import { IncomeType } from '../../common/enums/income-type.enum';

export class CreateIncomeDto {
  @IsUUID()
  work_id: string;

  @IsEnum(IncomeType)
  type: IncomeType;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  file_url?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  document_number?: string;

  @IsBoolean()
  @IsOptional()
  is_validated?: boolean;

  @IsString()
  @IsOptional()
  observations?: string;
}

