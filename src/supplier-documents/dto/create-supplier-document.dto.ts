import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { SupplierDocumentType } from '../../common/enums/supplier-document-type.enum';

export class CreateSupplierDocumentDto {
  @IsUUID()
  supplier_id: string;

  @IsEnum(SupplierDocumentType)
  document_type: SupplierDocumentType;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  file_url?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  document_number?: string;

  @IsDateString()
  @IsOptional()
  expiration_date?: string;

  @IsBoolean()
  @IsOptional()
  is_valid?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  version?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

