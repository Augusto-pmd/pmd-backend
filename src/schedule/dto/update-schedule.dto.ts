import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateScheduleDto } from './create-schedule.dto';

export class UpdateScheduleDto extends PartialType(
  OmitType(CreateScheduleDto, ['work_id'] as const),
) {}

