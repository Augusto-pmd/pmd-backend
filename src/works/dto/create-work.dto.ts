import {
  IsString,
  IsEnum,
  IsUUID,
  IsOptional,
  IsDateString,
  IsNumber,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Currency } from '../../common/enums/currency.enum';
import { WorkStatus } from '../../common/enums/work-status.enum';

export class CreateWorkDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(255)
  client: string;

  @IsString()
  address: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  @IsOptional()
  end_date?: string;

  @IsEnum(WorkStatus)
  @IsOptional()
  status?: WorkStatus;

  @IsEnum(Currency)
  currency: Currency;

  @IsUUID()
  @IsOptional()
  supervisor_id?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  total_budget?: number;
}

