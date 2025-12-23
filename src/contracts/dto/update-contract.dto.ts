import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { CreateContractDto } from './create-contract.dto';
import { Currency } from '../../common/enums/currency.enum';

export class UpdateContractDto extends PartialType(
  OmitType(CreateContractDto, ['work_id'] as const),
) {
  @IsBoolean()
  @IsOptional()
  is_blocked?: boolean;

  // These fields can only be modified by Direction (validated in service)
  @IsNumber()
  @IsOptional()
  @Min(0)
  amount_total?: number;

  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;
}

