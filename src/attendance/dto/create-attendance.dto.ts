import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '../../common/enums/attendance-status.enum';

export class CreateAttendanceDto {
  @ApiProperty({
    description: 'Employee UUID',
    format: 'uuid',
  })
  @IsUUID()
  employee_id: string;

  @ApiProperty({
    description: 'Attendance date',
    example: '2024-01-15',
  })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    description: 'Attendance status',
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;

  @ApiPropertyOptional({
    description: 'Late hours (only if status is LATE)',
    example: 1.5,
    minimum: 0,
    maximum: 8,
  })
  @IsNumber()
  @Min(0)
  @Max(8)
  @IsOptional()
  late_hours?: number;
}
