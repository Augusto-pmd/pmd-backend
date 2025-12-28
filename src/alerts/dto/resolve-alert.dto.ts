import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveAlertDto {
  @ApiPropertyOptional({
    description: 'Resolution notes or observations',
    example: 'Issue resolved by updating supplier documentation',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  resolution_notes?: string;
}

