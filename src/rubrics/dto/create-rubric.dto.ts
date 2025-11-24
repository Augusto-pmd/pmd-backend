import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateRubricDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

