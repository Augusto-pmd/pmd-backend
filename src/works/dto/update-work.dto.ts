import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkDto } from './create-work.dto';
import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Currency } from '../../common/enums/currency.enum';

export class UpdateWorkDto extends PartialType(CreateWorkDto) {
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  economic_progress?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  financial_progress?: number;
}
