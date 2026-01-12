import { ApiProperty } from '@nestjs/swagger';

/**
 * Work Statistics DTO
 * 
 * Adapted from PMD-asistencias Contractor stats logic.
 * Provides comprehensive statistics for a work including remaining balance and profitability.
 */
export class WorkStatsDto {
  @ApiProperty({ 
    description: 'Work ID', 
    type: String, 
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  work_id: string;

  @ApiProperty({ 
    description: 'Work name',
    example: 'Construcción Edificio A',
  })
  work_name: string;

  @ApiProperty({ 
    description: 'Total budget allocated to the work', 
    type: Number,
    example: 1000000.00,
  })
  total_budget: number;

  @ApiProperty({ 
    description: 'Total validated expenses incurred', 
    type: Number,
    example: 350000.00,
  })
  total_expenses: number;

  @ApiProperty({ 
    description: 'Total validated incomes received', 
    type: Number,
    example: 450000.00,
  })
  total_incomes: number;

  @ApiProperty({ 
    description: 'Remaining budget (total_budget - total_expenses). Cannot be negative.', 
    type: Number,
    example: 650000.00,
  })
  remaining_balance: number;

  @ApiProperty({ 
    description: 'Physical progress percentage based on completed stages', 
    type: Number, 
    minimum: 0, 
    maximum: 100,
    example: 45.5,
  })
  physical_progress: number;

  @ApiProperty({ 
    description: 'Economic progress percentage (incomes / budget * 100)', 
    type: Number, 
    minimum: 0, 
    maximum: 100,
    example: 45.0,
  })
  economic_progress: number;

  @ApiProperty({ 
    description: 'Financial progress percentage (incomes / (incomes + expenses) * 100)', 
    type: Number, 
    minimum: 0, 
    maximum: 100,
    example: 56.25,
  })
  financial_progress: number;

  @ApiProperty({ 
    description: 'Profitability (total_incomes - total_expenses). Can be negative if expenses exceed incomes.', 
    type: Number,
    example: 100000.00,
  })
  profitability: number;
}
