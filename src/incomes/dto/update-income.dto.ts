import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateIncomeDto } from './create-income.dto';

export class UpdateIncomeDto extends PartialType(
  OmitType(CreateIncomeDto, ['work_id', 'currency'] as const),
) {}

