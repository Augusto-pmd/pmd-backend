import { IsUUID, IsNumber, Min, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeAdvanceDto {
  @ApiProperty({ description: 'Employee UUID', format: 'uuid' })
  @IsUUID()
  employee_id: string;

  @ApiProperty({ description: 'Advance amount', example: 5000.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Advance date', example: '2024-01-15' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: 'Optional description', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description:
      'Week start date (Monday) where this advance will be discounted. If omitted, it will be calculated from date.',
    example: '2024-01-15',
  })
  @IsDateString()
  @IsOptional()
  week_start_date?: string;
}

