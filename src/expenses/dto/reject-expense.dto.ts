import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectExpenseDto {
  @ApiProperty({
    description: 'Rejection observations (mandatory)',
    example: 'Invoice does not match the purchase order',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty({ message: 'Observations are mandatory when rejecting an expense' })
  @MaxLength(1000)
  observations: string;
}

