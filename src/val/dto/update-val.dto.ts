import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateValDto } from './create-val.dto';

export class UpdateValDto extends PartialType(
  OmitType(CreateValDto, ['expense_id'] as const),
) {}

