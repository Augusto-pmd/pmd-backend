import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { SupplierDocumentsService } from './supplier-documents.service';
import { CreateSupplierDocumentDto } from './dto/create-supplier-document.dto';
import { UpdateSupplierDocumentDto } from './dto/update-supplier-document.dto';

@Controller('supplier-documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupplierDocumentsController {
  constructor(private readonly supplierDocumentsService: SupplierDocumentsService) {}

  @Post()
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  create(@Body() createSupplierDocumentDto: CreateSupplierDocumentDto) {
    return this.supplierDocumentsService.create(createSupplierDocumentDto);
  }

  @Get()
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  findAll() {
    return this.supplierDocumentsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  findOne(@Param('id') id: string) {
    return this.supplierDocumentsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  update(@Param('id') id: string, @Body() updateSupplierDocumentDto: UpdateSupplierDocumentDto) {
    return this.supplierDocumentsService.update(id, updateSupplierDocumentDto);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  remove(@Param('id') id: string) {
    return this.supplierDocumentsService.remove(id);
  }
}


