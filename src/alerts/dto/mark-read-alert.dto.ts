import { IsBoolean, IsOptional } from 'class-validator';

export class MarkReadAlertDto {
  @IsBoolean()
  @IsOptional()
  is_read?: boolean;
}

