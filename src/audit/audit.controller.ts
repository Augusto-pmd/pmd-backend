import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuditService } from './audit.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@ApiTags('Audit')
@ApiBearerAuth('JWT-auth')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post()
  @Roles(UserRole.DIRECTION, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.OPERATOR)
  @ApiOperation({
    summary: 'Create audit log',
    description: 'Create a new audit log entry. All authenticated users can create audit logs.',
  })
  @ApiBody({ type: CreateAuditLogDto })
  @ApiResponse({ status: 201, description: 'Audit log created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createAuditLogDto: CreateAuditLogDto, @Request() req) {
    // Use user from request if user_id is not provided
    if (!createAuditLogDto.user_id && req.user?.id) {
      createAuditLogDto.user_id = req.user.id;
    }
    return this.auditService.create(createAuditLogDto);
  }

  @Get()
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get all audit logs',
    description: 'Retrieve all audit logs with pagination. Only Direction can view audit logs.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50)', example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Paginated audit logs',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        total: { type: 'number', example: 150 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 50 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.auditService.findAll(page, limit);
  }

  @Get(':id')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get audit log by ID',
    description: 'Retrieve a specific audit log by its ID including user information. Only Direction can view audit logs.',
  })
  @ApiParam({ name: 'id', description: 'Audit log UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Audit log details' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  findOne(@Param('id') id: string) {
    return this.auditService.findOne(id);
  }

  @Get('module/:module')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get audit logs by module',
    description: 'Retrieve audit logs filtered by module with pagination. Only Direction can view audit logs.',
  })
  @ApiParam({ name: 'module', description: 'Module name', example: 'expenses' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50)', example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Paginated audit logs for the module',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        total: { type: 'number', example: 25 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 50 },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  findByModule(
    @Param('module') module: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.auditService.findByModule(module, page, limit);
  }

  @Get('user/:userId')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get audit logs by user',
    description: 'Retrieve audit logs filtered by user ID with pagination. Only Direction can view audit logs.',
  })
  @ApiParam({ name: 'userId', description: 'User UUID', type: String, format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50)', example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Paginated audit logs for the user',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        total: { type: 'number', example: 10 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 50 },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  findByUser(
    @Param('userId') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.auditService.findByUser(userId, page, limit);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Delete audit log',
    description: 'Delete a specific audit log. Only Direction can delete audit logs.',
  })
  @ApiParam({ name: 'id', description: 'Audit log UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Audit log deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only Direction can delete audit logs' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  remove(@Param('id') id: string) {
    return this.auditService.remove(id);
  }

  @Delete()
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Delete all audit logs',
    description: 'Delete all audit logs. Only Direction can perform this action. This action cannot be undone.',
  })
  @ApiResponse({
    status: 200,
    description: 'All audit logs deleted',
    schema: {
      type: 'object',
      properties: {
        deleted: { type: 'number', example: 150 },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Only Direction can delete all audit logs' })
  removeAll() {
    return this.auditService.removeAll();
  }

  @Get('action/:action')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get audit logs by action',
    description: 'Retrieve audit logs filtered by action type (e.g., login, logout, login_failed) with pagination. Only Direction can view audit logs.',
  })
  @ApiParam({ name: 'action', description: 'Action type', example: 'login' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50)', example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Paginated audit logs for the action',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  findByAction(
    @Param('action') action: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.auditService.findByAction(action, page, limit);
  }

  @Get('ip/:ipAddress')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get audit logs by IP address',
    description: 'Retrieve audit logs filtered by IP address with pagination. Only Direction can view audit logs.',
  })
  @ApiParam({ name: 'ipAddress', description: 'IP address', example: '192.168.1.1' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50)', example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Paginated audit logs for the IP address',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  findByIp(
    @Param('ipAddress') ipAddress: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.auditService.findByIp(ipAddress, page, limit);
  }
}


