import { PartialType } from '@nestjs/mapped-types';
import { CreateSupplierDocumentDto } from './create-supplier-document.dto';

export class UpdateSupplierDocumentDto extends PartialType(
  CreateSupplierDocumentDto,
) {}

