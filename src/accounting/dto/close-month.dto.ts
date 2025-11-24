import { IsInt, IsEnum, Min, Max } from 'class-validator';
import { MonthStatus } from '../../common/enums/month-status.enum';

export class CloseMonthDto {
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(2000)
  year: number;

  @IsEnum(MonthStatus)
  status: MonthStatus;
}

