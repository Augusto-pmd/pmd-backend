import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../../common/enums/currency.enum';
import { DocumentType } from '../../common/enums/document-type.enum';
import { ExpenseState } from '../../common/enums/expense-state.enum';

export class CreateExpenseDto {
  @ApiProperty({
    description: 'Work UUID (mandatory)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  work_id: string;

  @ApiPropertyOptional({
    description: 'Supplier UUID (required if document_type is not VAL)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @ValidateIf((o) => o.document_type !== DocumentType.VAL)
  @IsUUID({ message: 'supplier_id is required when document_type is not VAL' })
  @IsOptional()
  supplier_id?: string;

  @ApiProperty({
    description: 'Rubric/Category UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  rubric_id: string;

  @ApiProperty({
    description: 'Expense amount',
    example: 15000.50,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Currency',
    enum: Currency,
    example: Currency.ARS,
  })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({
    description: 'Purchase date (ISO 8601 format)',
    example: '2024-01-15',
    type: String,
    format: 'date',
  })
  @IsDateString()
  purchase_date: string;

  @ApiProperty({
    description: 'Document type',
    enum: DocumentType,
    example: DocumentType.INVOICE_A,
  })
  @IsEnum(DocumentType)
  document_type: DocumentType;

  @ApiPropertyOptional({
    description: 'Document number (required for fiscal invoices: INVOICE_A, INVOICE_B, INVOICE_C)',
    example: '0001-00001234',
    maxLength: 100,
  })
  @ValidateIf((o) => 
    o.document_type === DocumentType.INVOICE_A ||
    o.document_type === DocumentType.INVOICE_B ||
    o.document_type === DocumentType.INVOICE_C
  )
  @IsString({ message: 'document_number is required for fiscal invoices' })
  @MaxLength(100)
  @IsOptional()
  document_number?: string;

  @ApiPropertyOptional({
    description: 'Expense state (defaults to pending)',
    enum: ExpenseState,
    example: ExpenseState.PENDING,
    default: ExpenseState.PENDING,
  })
  @IsEnum(ExpenseState)
  @IsOptional()
  state?: ExpenseState;

  @ApiPropertyOptional({
    description: 'File URL for attached document',
    example: 'https://drive.google.com/file/...',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  file_url?: string;

  @ApiPropertyOptional({
    description: 'Observations or notes',
    example: 'Urgent payment required',
  })
  @IsString()
  @IsOptional()
  observations?: string;

  @ApiPropertyOptional({
    description: 'VAT amount',
    example: 3150.00,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  vat_amount?: number;

  @ApiPropertyOptional({
    description: 'VAT rate percentage (0-100)',
    example: 21,
    minimum: 0,
    maximum: 100,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  vat_rate?: number;

  @ApiPropertyOptional({
    description: 'VAT perception amount',
    example: 500.00,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  vat_perception?: number;

  @ApiPropertyOptional({
    description: 'VAT withholding amount',
    example: 200.00,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  vat_withholding?: number;

  @ApiPropertyOptional({
    description: 'IIBB perception amount',
    example: 300.00,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  iibb_perception?: number;

  @ApiPropertyOptional({
    description: 'Income tax withholding amount',
    example: 150.00,
    minimum: 0,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  income_tax_withholding?: number;
}

