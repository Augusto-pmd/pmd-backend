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
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { WorkDocumentsService } from './work-documents.service';
import { CreateWorkDocumentDto } from './dto/create-work-document.dto';
import { UpdateWorkDocumentDto } from './dto/update-work-document.dto';

@ApiTags('Work Documents')
@ApiBearerAuth('JWT-auth')
@Controller('work-documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkDocumentsController {
  constructor(private readonly workDocumentsService: WorkDocumentsService) {}

  @Post()
  @Roles(UserRole.OPERATOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Create work document', description: 'Create a new work document. Operators, Administration, and Direction can create documents. Supervisors can only read documents.' })
  @ApiBody({ type: CreateWorkDocumentDto })
  @ApiResponse({ status: 201, description: 'Work document created successfully' })
  @ApiResponse({ status: 404, description: 'Work not found' })
  create(@Body() createDto: CreateWorkDocumentDto, @Request() req) {
    return this.workDocumentsService.create(createDto, req.user);
  }

  @Get()
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get all work documents' })
  @ApiQuery({ name: 'work_id', required: false, description: 'Filter by work ID' })
  @ApiResponse({ status: 200, description: 'List of work documents' })
  findAll(@Query('work_id') workId: string, @Request() req) {
    return this.workDocumentsService.findAll(workId, req.user);
  }

  @Get('works/:workId/documents')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get documents for a specific work' })
  @ApiParam({ name: 'workId', description: 'Work UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of work documents' })
  findByWork(@Param('workId') workId: string, @Request() req) {
    return this.workDocumentsService.findAll(workId, req.user);
  }

  @Get(':id')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get work document by ID' })
  @ApiParam({ name: 'id', description: 'Work document UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Work document details' })
  @ApiResponse({ status: 404, description: 'Work document not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.workDocumentsService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Update work document', description: 'Update a work document. Only Administration and Direction can update documents. Supervisors can only read documents.' })
  @ApiParam({ name: 'id', description: 'Work document UUID', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateWorkDocumentDto })
  @ApiResponse({ status: 200, description: 'Work document updated successfully' })
  update(@Param('id') id: string, @Body() updateDto: UpdateWorkDocumentDto, @Request() req) {
    return this.workDocumentsService.update(id, updateDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({ 
    summary: 'Delete work document',
    description: 'Delete work document. Only Direction can delete work documents.',
  })
  @ApiParam({ name: 'id', description: 'Work document UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Work document deleted successfully' })
  remove(@Param('id') id: string, @Request() req) {
    return this.workDocumentsService.remove(id, req.user);
  }
}

