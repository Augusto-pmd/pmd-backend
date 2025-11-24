import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  MaxLength,
} from 'class-validator';
import { ScheduleState } from '../../common/enums/schedule-state.enum';

export class CreateScheduleDto {
  @IsUUID()
  work_id: string;

  @IsString()
  @MaxLength(255)
  stage_name: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsDateString()
  @IsOptional()
  actual_end_date?: string;

  @IsEnum(ScheduleState)
  @IsOptional()
  state?: ScheduleState;

  @IsInt()
  @IsOptional()
  order?: number;

  @IsString()
  @IsOptional()
  description?: string;
}

