import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RejectDifferenceDto {
  @ApiPropertyOptional({
    description: 'Reason for rejecting the difference',
    example: 'La diferencia no está justificada según los movimientos registrados',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

