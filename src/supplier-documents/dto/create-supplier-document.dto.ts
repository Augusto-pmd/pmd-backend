import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierDocumentType } from '../../common/enums/supplier-document-type.enum';

export class CreateSupplierDocumentDto {
  @ApiProperty({
    description: 'Supplier UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  supplier_id: string;

  @ApiProperty({
    description: 'Document type',
    enum: SupplierDocumentType,
    example: SupplierDocumentType.ART,
  })
  @IsEnum(SupplierDocumentType)
  document_type: SupplierDocumentType;

  @ApiPropertyOptional({
    description: 'File URL for the document',
    example: 'https://drive.google.com/file/...',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  file_url?: string;

  @ApiPropertyOptional({
    description: 'Document number',
    example: 'ART-12345',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  document_number?: string;

  @ApiPropertyOptional({
    description: 'Document expiration date (ISO 8601 format). Required for ART documents.',
    example: '2024-12-31',
    type: String,
    format: 'date',
  })
  @IsDateString()
  @IsOptional()
  expiration_date?: string;

  @ApiPropertyOptional({
    description: 'Whether the document is valid',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_valid?: boolean;

  @ApiPropertyOptional({
    description: 'Document version',
    example: 'v1.0',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  version?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the document',
    example: 'Documento original escaneado',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

