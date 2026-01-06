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
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('Roles')
@ApiBearerAuth('JWT-auth')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Create role',
    description: 'Create a new role with permissions. Only Direction can create roles.',
  })
  @ApiBody({ type: CreateRoleDto })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Only Direction can create roles' })
  create(@Body() createRoleDto: CreateRoleDto, @Request() req) {
    return this.rolesService.create(createRoleDto, req.user);
  }

  @Get()
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get all roles',
    description: 'Retrieve all available roles. Only Direction can view roles.',
  })
  @ApiResponse({ status: 200, description: 'List of roles' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  findAll(@Request() req) {
    return this.rolesService.findAll(req.user);
  }

  @Get(':id')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get role by ID',
    description: 'Retrieve a specific role by its ID including permissions. Only Direction can view roles.',
  })
  @ApiParam({ name: 'id', description: 'Role UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Role details' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.rolesService.findOne(id, req.user);
  }

  @Get(':id/permissions')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get role permissions',
    description: 'Retrieve permissions for a specific role as a key-value object. Only Direction can view role permissions.',
  })
  @ApiParam({ name: 'id', description: 'Role UUID', type: String, format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Role permissions',
    schema: {
      type: 'object',
      additionalProperties: { type: 'boolean' },
      example: { 'expenses.create': true, 'expenses.validate': false },
    },
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  getPermissions(@Param('id') id: string, @Request() req) {
    return this.rolesService.getPermissions(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Update role',
    description: 'Update a role including its permissions. Only Direction can update roles.',
  })
  @ApiParam({ name: 'id', description: 'Role UUID', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 403, description: 'Only Direction can update roles' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto, @Request() req) {
    return this.rolesService.update(id, updateRoleDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Delete role',
    description: 'Delete a role. Only Direction can delete roles. This action cannot be undone.',
  })
  @ApiParam({ name: 'id', description: 'Role UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only Direction can delete roles' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  remove(@Param('id') id: string, @Request() req) {
    return this.rolesService.remove(id, req.user);
  }
}


