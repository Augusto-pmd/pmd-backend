import {
  IsUUID,
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkDocumentType, WorkDocumentStatus } from '../work-documents.entity';

export class CreateWorkDocumentDto {
  @ApiProperty({
    description: 'Work UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  work_id: string;

  @ApiProperty({
    description: 'File URL',
    example: 'https://storage.example.com/files/document.pdf',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  file_url: string;

  @ApiPropertyOptional({
    description: 'Document name. If not provided, will be extracted from the file name.',
    example: 'Planta Baja - V1.2',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'Document type',
    enum: WorkDocumentType,
    example: WorkDocumentType.CONTRACT,
  })
  @IsEnum(WorkDocumentType)
  type: WorkDocumentType;

  @ApiPropertyOptional({
    description: 'Document status',
    enum: WorkDocumentStatus,
    example: WorkDocumentStatus.DRAFT,
    default: WorkDocumentStatus.DRAFT,
  })
  @IsEnum(WorkDocumentStatus)
  @IsOptional()
  status?: WorkDocumentStatus;

  @ApiPropertyOptional({
    description: 'Document version',
    example: '1.0',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  version?: string;

  @ApiPropertyOptional({
    description: 'Notes or observations',
    example: 'Initial contract version',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'User ID of the person responsible for the document. If not provided, will use the authenticated user.',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  created_by_id?: string;
}

