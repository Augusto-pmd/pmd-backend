import {
  IsString,
  IsArray,
  ValidateNested,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAttendanceDto } from './create-attendance.dto';

export class BulkAttendanceDto {
  @ApiProperty({
    description: 'Week start date (Monday)',
    example: '2024-01-15',
  })
  @IsDateString()
  week_start_date: string;

  @ApiPropertyOptional({
    description: 'Work (obra) UUID to filter employees',
    format: 'uuid',
  })
  @IsString()
  @IsOptional()
  work_id?: string;

  @ApiProperty({
    description: 'Array of attendance records',
    type: [CreateAttendanceDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttendanceDto)
  attendances: CreateAttendanceDto[];
}
