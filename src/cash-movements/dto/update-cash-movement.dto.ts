import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateCashMovementDto } from './create-cash-movement.dto';

export class UpdateCashMovementDto extends PartialType(
  OmitType(CreateCashMovementDto, ['cashbox_id', 'currency'] as const),
) {}

