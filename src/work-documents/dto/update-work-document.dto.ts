import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkDocumentDto } from './create-work-document.dto';

export class UpdateWorkDocumentDto extends PartialType(CreateWorkDocumentDto) {}

