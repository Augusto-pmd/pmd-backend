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
import { ValService } from './val.service';
import { CreateValDto } from './dto/create-val.dto';
import { UpdateValDto } from './dto/update-val.dto';

@ApiTags('VAL')
@ApiBearerAuth('JWT-auth')
@Controller('val')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ValController {
  constructor(private readonly valService: ValService) {}

  @Post()
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Create VAL document',
    description: 'Create a new VAL (Vale) document. VAL documents are auto-generated for expenses without fiscal documents. Only Administration and Direction can manually create VAL documents.',
  })
  @ApiBody({ type: CreateValDto })
  @ApiResponse({ status: 201, description: 'VAL document created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  create(@Body() createDto: CreateValDto, @Request() req) {
    return this.valService.create(createDto, req.user);
  }

  @Get()
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get all VAL documents',
    description: 'Retrieve all VAL documents filtered by organization. Only Administration and Direction can view VAL documents.',
  })
  @ApiResponse({ status: 200, description: 'List of VAL documents' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  findAll(@Request() req) {
    return this.valService.findAll(req.user);
  }

  @Get(':id')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get VAL document by ID',
    description: 'Retrieve a specific VAL document by its ID. Document must belong to the user\'s organization.',
  })
  @ApiParam({ name: 'id', description: 'VAL UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'VAL document details' })
  @ApiResponse({ status: 403, description: 'VAL document does not belong to your organization' })
  @ApiResponse({ status: 404, description: 'VAL document not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.valService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Update VAL document',
    description: 'Update a VAL document. Only Administration and Direction can update VAL documents.',
  })
  @ApiParam({ name: 'id', description: 'VAL UUID', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateValDto })
  @ApiResponse({ status: 200, description: 'VAL document updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions or VAL does not belong to your organization' })
  @ApiResponse({ status: 404, description: 'VAL document not found' })
  update(@Param('id') id: string, @Body() updateDto: UpdateValDto, @Request() req) {
    return this.valService.update(id, updateDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Delete VAL document',
    description: 'Delete a VAL document. Only Direction can delete VAL documents. This action cannot be undone.',
  })
  @ApiParam({ name: 'id', description: 'VAL UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'VAL document deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only Direction can delete VAL documents' })
  @ApiResponse({ status: 404, description: 'VAL document not found' })
  remove(@Param('id') id: string, @Request() req) {
    return this.valService.remove(id, req.user);
  }
}

