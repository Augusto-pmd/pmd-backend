import { IsInt, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MonthStatus } from '../../common/enums/month-status.enum';

export class CloseMonthDto {
  @ApiProperty({
    description: 'Month number (1-12)',
    example: 1,
    minimum: 1,
    maximum: 12,
    type: Number,
  })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({
    description: 'Year (4 digits)',
    example: 2024,
    minimum: 2000,
    type: Number,
  })
  @IsInt()
  @Min(2000)
  year: number;

  @ApiProperty({
    description: 'Month status',
    enum: MonthStatus,
    example: MonthStatus.CLOSED,
  })
  @IsEnum(MonthStatus)
  status: MonthStatus;
}

