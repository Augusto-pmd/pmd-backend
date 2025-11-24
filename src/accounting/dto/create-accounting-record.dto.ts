import {
  IsEnum,
  IsUUID,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { AccountingType } from '../../common/enums/accounting-type.enum';
import { Currency } from '../../common/enums/currency.enum';

export class CreateAccountingRecordDto {
  @IsEnum(AccountingType)
  accounting_type: AccountingType;

  @IsUUID()
  @IsOptional()
  expense_id?: string;

  @IsUUID()
  @IsOptional()
  work_id?: string;

  @IsUUID()
  @IsOptional()
  supplier_id?: string;

  @IsDateString()
  date: string;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(2000)
  year: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  document_number?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsNumber()
  @IsOptional()
  @Min(0)
  vat_amount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  vat_rate?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  vat_perception?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  vat_withholding?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  iibb_perception?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  income_tax_withholding?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  file_url?: string;
}

