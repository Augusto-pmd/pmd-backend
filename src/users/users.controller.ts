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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Create user',
    description: 'Create a new user. Only Direction can create users. User will be assigned to the same organization as the creator.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or role not found' })
  @ApiResponse({ status: 403, description: 'Only Direction can create users' })
  create(@Body() createUserDto: CreateUserDto, @Request() req) {
    return this.usersService.create(createUserDto, req.user);
  }

  @Get()
  @Roles(UserRole.DIRECTION, UserRole.SUPERVISOR, UserRole.ADMINISTRATION)
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieve all users filtered by organization. Direction, Supervisors, and Administration can view users.',
  })
  @ApiResponse({ status: 200, description: 'List of users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  findAll(@Request() req) {
    return this.usersService.findAll(req.user);
  }

  @Get('me')
  @Roles(UserRole.DIRECTION, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.OPERATOR)
  @ApiOperation({
    summary: 'Get current user',
    description: 'Retrieve the currently authenticated user\'s information including role and permissions.',
  })
  @ApiResponse({ status: 200, description: 'Current user details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@Request() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Get(':id')
  @Roles(UserRole.DIRECTION, UserRole.SUPERVISOR, UserRole.ADMINISTRATION)
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve a specific user by their ID. User must belong to the requester\'s organization.',
  })
  @ApiParam({ name: 'id', description: 'User UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 403, description: 'User does not belong to your organization' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Update user',
    description: 'Update a user. Only Direction can update users. Password will be hashed automatically if provided.',
  })
  @ApiParam({ name: 'id', description: 'User UUID', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 403, description: 'Only Direction can update users' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req) {
    return this.usersService.update(id, updateUserDto, req.user);
  }

  @Patch(':id/role')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Update user role',
    description: 'Update a user\'s role. Only Direction can update user roles.',
  })
  @ApiParam({ name: 'id', description: 'User UUID', type: String, format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        role_id: {
          type: 'string',
          format: 'uuid',
          description: 'Role UUID',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
      required: ['role_id'],
    },
  })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  @ApiResponse({ status: 400, description: 'Role not found' })
  @ApiResponse({ status: 403, description: 'Only Direction can update user roles' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateRole(@Param('id') id: string, @Body() body: { role_id: string }, @Request() req) {
    return this.usersService.updateRole(id, body.role_id, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Delete user',
    description: 'Delete a user. Only Direction can delete users. This action cannot be undone.',
  })
  @ApiParam({ name: 'id', description: 'User UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only Direction can delete users' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string, @Request() req) {
    return this.usersService.remove(id, req.user);
  }
}


