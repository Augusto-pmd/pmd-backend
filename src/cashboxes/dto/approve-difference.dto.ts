import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveDifferenceDto {
  @ApiPropertyOptional({
    description: 'Notes about the difference approval',
    example: 'Difference approved after review',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

