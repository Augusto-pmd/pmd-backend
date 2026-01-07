import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
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
import { WorkUsersService } from './work-users.service';
import { User } from '../users/user.entity';

@ApiTags('Work Users')
@ApiBearerAuth('JWT-auth')
@Controller('works/:workId/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkUsersController {
  constructor(private readonly workUsersService: WorkUsersService) {}

  @Post()
  @Roles(UserRole.DIRECTION, UserRole.ADMINISTRATION, UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Assign user to work',
    description: 'Assign a user to a work. Only Direction, Administration and Supervisor can assign users.',
  })
  @ApiParam({ name: 'workId', description: 'Work UUID', type: String, format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', format: 'uuid' },
        role: { type: 'string', nullable: true },
      },
      required: ['user_id'],
    },
  })
  @ApiResponse({ status: 201, description: 'User assigned successfully' })
  @ApiResponse({ status: 400, description: 'User is already assigned or validation error' })
  @ApiResponse({ status: 404, description: 'Work or user not found' })
  async assignUser(
    @Param('workId') workId: string,
    @Body() body: { user_id: string; role?: string },
    @Request() req,
  ) {
    return await this.workUsersService.assignUser(workId, body.user_id, body.role, req.user);
  }

  @Delete(':userId')
  @Roles(UserRole.DIRECTION, UserRole.ADMINISTRATION, UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Unassign user from work',
    description: 'Unassign a user from a work. Only Direction, Administration and Supervisor can unassign users.',
  })
  @ApiParam({ name: 'workId', description: 'Work UUID', type: String, format: 'uuid' })
  @ApiParam({ name: 'userId', description: 'User UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User unassigned successfully' })
  @ApiResponse({ status: 404, description: 'Work or user assignment not found' })
  async unassignUser(
    @Param('workId') workId: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    await this.workUsersService.unassignUser(workId, userId, req.user);
    return { message: 'User unassigned successfully' };
  }

  @Get()
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION, UserRole.OPERATOR)
  @ApiOperation({
    summary: 'Get assigned users for a work',
    description: 'Get all users assigned to a work.',
  })
  @ApiParam({ name: 'workId', description: 'Work UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of assigned users', type: [User] })
  @ApiResponse({ status: 404, description: 'Work not found' })
  async getAssignedUsers(@Param('workId') workId: string, @Request() req) {
    return await this.workUsersService.getAssignedUsers(workId, req.user);
  }
}

