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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { SupplierDocumentsService } from './supplier-documents.service';
import { CreateSupplierDocumentDto } from './dto/create-supplier-document.dto';
import { UpdateSupplierDocumentDto } from './dto/update-supplier-document.dto';

@ApiTags('Supplier Documents')
@ApiBearerAuth('JWT-auth')
@Controller('supplier-documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupplierDocumentsController {
  constructor(private readonly supplierDocumentsService: SupplierDocumentsService) {}

  @Post()
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Create supplier document',
    description: 'Create a new document for a supplier (e.g., ART, insurance, certifications). ART documents with expiration dates will trigger alerts when expired. Only Administration and Direction can create documents.',
  })
  @ApiBody({ type: CreateSupplierDocumentDto })
  @ApiResponse({ status: 201, description: 'Supplier document created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or supplier not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  create(@Body() createSupplierDocumentDto: CreateSupplierDocumentDto) {
    return this.supplierDocumentsService.create(createSupplierDocumentDto);
  }

  @Get()
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get all supplier documents',
    description: 'Retrieve all supplier documents. Supervisors, Administration, and Direction can view documents.',
  })
  @ApiResponse({ status: 200, description: 'List of supplier documents' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  findAll() {
    return this.supplierDocumentsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get supplier document by ID',
    description: 'Retrieve a specific supplier document by its ID.',
  })
  @ApiParam({ name: 'id', description: 'Supplier document UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Supplier document details' })
  @ApiResponse({ status: 404, description: 'Supplier document not found' })
  findOne(@Param('id') id: string) {
    return this.supplierDocumentsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Update supplier document',
    description: 'Update a supplier document. Only Administration and Direction can update documents.',
  })
  @ApiParam({ name: 'id', description: 'Supplier document UUID', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateSupplierDocumentDto })
  @ApiResponse({ status: 200, description: 'Supplier document updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Supplier document not found' })
  update(@Param('id') id: string, @Body() updateSupplierDocumentDto: UpdateSupplierDocumentDto) {
    return this.supplierDocumentsService.update(id, updateSupplierDocumentDto);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Delete supplier document',
    description: 'Delete a supplier document. Only Direction can delete documents. This action cannot be undone.',
  })
  @ApiParam({ name: 'id', description: 'Supplier document UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Supplier document deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only Direction can delete supplier documents' })
  @ApiResponse({ status: 404, description: 'Supplier document not found' })
  remove(@Param('id') id: string) {
    return this.supplierDocumentsService.remove(id);
  }
}


