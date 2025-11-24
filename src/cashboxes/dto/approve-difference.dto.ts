import { IsOptional } from 'class-validator';

export class ApproveDifferenceDto {
  @IsOptional()
  notes?: string;
}

