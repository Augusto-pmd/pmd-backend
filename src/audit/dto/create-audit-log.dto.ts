import {
  IsUUID,
  IsString,
  IsOptional,
  IsObject,
  MaxLength,
} from 'class-validator';

export class CreateAuditLogDto {
  @IsUUID()
  @IsOptional()
  user_id?: string;

  @IsString()
  @MaxLength(100)
  action: string;

  @IsString()
  @MaxLength(100)
  module: string;

  @IsUUID()
  @IsOptional()
  entity_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  entity_type?: string;

  @IsObject()
  @IsOptional()
  previous_value?: Record<string, any>;

  @IsObject()
  @IsOptional()
  new_value?: Record<string, any>;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  ip_address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  user_agent?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  criticality?: string;
}

