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
import { WorksService } from './works.service';
import { CreateWorkDto } from './dto/create-work.dto';
import { UpdateWorkDto } from './dto/update-work.dto';

@ApiTags('Works')
@ApiBearerAuth('JWT-auth')
@Controller('works')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorksController {
  constructor(private readonly worksService: WorksService) {}

  @Post()
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Create work',
    description: 'Create a new work/project. Only Direction can create works. Work will be assigned to the creator\'s organization.',
  })
  @ApiBody({ type: CreateWorkDto })
  @ApiResponse({ status: 201, description: 'Work created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Only Direction can create works' })
  create(@Body() createWorkDto: CreateWorkDto, @Request() req) {
    return this.worksService.create(createWorkDto, req.user);
  }

  @Get()
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get all works',
    description: 'Retrieve all works filtered by organization. Supervisors can only see works assigned to them.',
  })
  @ApiResponse({ status: 200, description: 'List of works' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  findAll(@Request() req) {
    return this.worksService.findAll(req.user);
  }

  @Get(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION, UserRole.OPERATOR)
  @ApiOperation({
    summary: 'Get work by ID',
    description: 'Retrieve a specific work by its ID. Work must belong to the user\'s organization. Operators can access works.',
  })
  @ApiParam({ name: 'id', description: 'Work UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Work details' })
  @ApiResponse({ status: 403, description: 'Work does not belong to your organization' })
  @ApiResponse({ status: 404, description: 'Work not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.worksService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.DIRECTION, UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Update work',
    description: 'Update a work. Direction and Supervisors can update works. Work totals (expenses, incomes) are automatically calculated.',
  })
  @ApiParam({ name: 'id', description: 'Work UUID', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateWorkDto })
  @ApiResponse({ status: 200, description: 'Work updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions or work does not belong to your organization' })
  @ApiResponse({ status: 404, description: 'Work not found' })
  update(@Param('id') id: string, @Body() updateWorkDto: UpdateWorkDto, @Request() req) {
    return this.worksService.update(id, updateWorkDto, req.user);
  }

  @Post(':id/close')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Close work',
    description: 'Close a work. Only Direction can close works. Closed works cannot have new expenses created (except by Direction).',
  })
  @ApiParam({ name: 'id', description: 'Work UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Work closed successfully' })
  @ApiResponse({ status: 403, description: 'Only Direction can close works' })
  @ApiResponse({ status: 404, description: 'Work not found' })
  close(@Param('id') id: string, @Request() req) {
    return this.worksService.close(id, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Delete work',
    description: 'Delete a work. Only Direction can delete works. This action cannot be undone.',
  })
  @ApiParam({ name: 'id', description: 'Work UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Work deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only Direction can delete works' })
  @ApiResponse({ status: 404, description: 'Work not found' })
  remove(@Param('id') id: string, @Request() req) {
    return this.worksService.remove(id, req.user);
  }
}


