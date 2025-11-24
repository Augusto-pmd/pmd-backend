import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateCashboxDto } from './create-cashbox.dto';

export class UpdateCashboxDto extends PartialType(
  OmitType(CreateCashboxDto, ['user_id'] as const),
) {}

