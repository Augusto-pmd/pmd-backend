import { IsUUID, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateValDto {
  @IsUUID()
  expense_id: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  file_url?: string;
}

