import {
  IsEnum,
  IsString,
  IsOptional,
  IsUUID,
  IsObject,
  MaxLength,
} from 'class-validator';
import { AlertType } from '../../common/enums/alert-type.enum';
import { AlertSeverity } from '../../common/enums/alert-severity.enum';

export class CreateAlertDto {
  @IsEnum(AlertType)
  type: AlertType;

  @IsEnum(AlertSeverity)
  @IsOptional()
  severity?: AlertSeverity;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  message: string;

  @IsUUID()
  @IsOptional()
  user_id?: string;

  @IsUUID()
  @IsOptional()
  work_id?: string;

  @IsUUID()
  @IsOptional()
  supplier_id?: string;

  @IsUUID()
  @IsOptional()
  expense_id?: string;

  @IsUUID()
  @IsOptional()
  contract_id?: string;

  @IsUUID()
  @IsOptional()
  cashbox_id?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

