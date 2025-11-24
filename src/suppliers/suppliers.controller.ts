import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@ApiTags('Suppliers')
@ApiBearerAuth('JWT-auth')
@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @Roles(UserRole.OPERATOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Create supplier',
    description: 'Create a new supplier. Operators can only create provisional suppliers.',
  })
  @ApiBody({ type: CreateSupplierDto })
  @ApiResponse({ status: 201, description: 'Supplier created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() createSupplierDto: CreateSupplierDto, @Request() req) {
    return this.suppliersService.create(createSupplierDto, req.user);
  }

  @Get()
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get all suppliers' })
  @ApiResponse({ status: 200, description: 'List of suppliers' })
  findAll(@Request() req) {
    return this.suppliersService.findAll(req.user);
  }

  @Get(':id')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiParam({ name: 'id', description: 'Supplier UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Supplier details' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.suppliersService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.OPERATOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Update supplier' })
  @ApiParam({ name: 'id', description: 'Supplier UUID', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateSupplierDto })
  @ApiResponse({ status: 200, description: 'Supplier updated successfully' })
  update(@Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto, @Request() req) {
    return this.suppliersService.update(id, updateSupplierDto, req.user);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Approve provisional supplier',
    description: 'Approve a provisional supplier. Only Administration and Direction can approve.',
  })
  @ApiParam({ name: 'id', description: 'Supplier UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Supplier approved successfully' })
  @ApiResponse({ status: 400, description: 'Only provisional suppliers can be approved' })
  @ApiResponse({ status: 403, description: 'Only Administration and Direction can approve' })
  approve(@Param('id') id: string, @Request() req) {
    return this.suppliersService.approve(id, req.user);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Reject provisional supplier',
    description: 'Reject a provisional supplier. Alerts are generated for expense reassignment.',
  })
  @ApiParam({ name: 'id', description: 'Supplier UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Supplier rejected successfully' })
  @ApiResponse({ status: 400, description: 'Only provisional suppliers can be rejected' })
  @ApiResponse({ status: 403, description: 'Only Administration and Direction can reject' })
  reject(@Param('id') id: string, @Request() req) {
    return this.suppliersService.reject(id, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Delete supplier',
    description: 'Delete a supplier. Only Direction can delete suppliers.',
  })
  @ApiParam({ name: 'id', description: 'Supplier UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Supplier deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only Direction can delete suppliers' })
  remove(@Param('id') id: string, @Request() req) {
    return this.suppliersService.remove(id, req.user);
  }
}

