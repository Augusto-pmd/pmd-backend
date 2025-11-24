import { PartialType } from '@nestjs/mapped-types';
import { CreateAccountingRecordDto } from './create-accounting-record.dto';

export class UpdateAccountingRecordDto extends PartialType(
  CreateAccountingRecordDto,
) {}

