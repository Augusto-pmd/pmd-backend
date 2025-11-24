import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateContractDto } from './create-contract.dto';

export class UpdateContractDto extends PartialType(
  OmitType(CreateContractDto, ['work_id', 'currency'] as const),
) {
  @IsBoolean()
  @IsOptional()
  is_blocked?: boolean;
}

