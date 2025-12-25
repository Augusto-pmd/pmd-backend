import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { SupplierStatus } from '../../common/enums/supplier-status.enum';
import { IsCuit } from '../../common/validators/cuit.validator';

export class CreateSupplierDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  @IsCuit({ message: 'CUIT must be a valid 11-digit CUIT number' })
  cuit?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  category?: string;

  @IsEnum(SupplierStatus)
  @IsOptional()
  status?: SupplierStatus;

  @IsString()
  @IsOptional()
  address?: string;

  @IsUUID()
  @IsOptional()
  created_by_id?: string;
}

