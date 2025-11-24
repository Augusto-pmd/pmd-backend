import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { BudgetType } from '../../common/enums/budget-type.enum';

export class CreateWorkBudgetDto {
  @IsUUID()
  work_id: string;

  @IsEnum(BudgetType)
  @IsOptional()
  type?: BudgetType;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  file_url?: string;
}

