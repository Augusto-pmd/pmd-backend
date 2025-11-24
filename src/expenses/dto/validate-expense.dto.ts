import { IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseState } from '../../common/enums/expense-state.enum';

export class ValidateExpenseDto {
  @ApiProperty({
    description: 'New expense state (validated, observed, or annulled)',
    enum: ExpenseState,
    example: ExpenseState.VALIDATED,
  })
  @IsEnum(ExpenseState)
  state: ExpenseState;

  @ApiPropertyOptional({
    description: 'Observations or notes about the validation',
    example: 'Document verified, all information correct',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  observations?: string;
}

