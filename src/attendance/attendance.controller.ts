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
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';

@ApiTags('Attendance')
@ApiBearerAuth('JWT-auth')
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Create attendance record',
    description: 'Register attendance for an employee. Automatically calculates week_start_date.',
  })
  @ApiBody({ type: CreateAttendanceDto })
  @ApiResponse({ status: 201, description: 'Attendance created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() createAttendanceDto: CreateAttendanceDto, @Request() req) {
    return this.attendanceService.create(createAttendanceDto, req.user);
  }

  @Get()
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get all attendance records',
    description:
      'List attendance records. By default shows all. Use filterByOrganization=true to filter by user organization.',
  })
  @ApiQuery({
    name: 'filterByOrganization',
    required: false,
    type: Boolean,
    description:
      'If true, filter by user organization. Default false = show all.',
  })
  @ApiQuery({
    name: 'week_start_date',
    required: false,
    type: String,
    description: 'Filter by week start date (Monday)',
  })
  @ApiQuery({
    name: 'employee_id',
    required: false,
    type: String,
    description: 'Filter by employee UUID',
  })
  @ApiQuery({
    name: 'work_id',
    required: false,
    type: String,
    description: 'Filter by work (obra) UUID',
  })
  @ApiResponse({ status: 200, description: 'List of attendance records' })
  findAll(
    @Request() req,
    @Query('filterByOrganization') filterByOrganization?: string,
    @Query('week_start_date') week_start_date?: string,
    @Query('employee_id') employee_id?: string,
    @Query('work_id') work_id?: string,
  ) {
    const filterByOrg =
      filterByOrganization === 'true' || filterByOrganization === '1';
    return this.attendanceService.findAll(req.user, {
      filterByOrganization: filterByOrg,
      week_start_date: week_start_date || undefined,
      employee_id: employee_id || undefined,
      work_id: work_id || undefined,
    });
  }

  @Get('week/:week_start_date')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get weekly attendance sheet',
    description: 'Get all attendance records for a specific week (week start date = Monday).',
  })
  @ApiParam({
    name: 'week_start_date',
    description: 'Week start date (Monday)',
    example: '2024-01-15',
  })
  @ApiQuery({
    name: 'filterByOrganization',
    required: false,
    type: Boolean,
    description: 'If true, filter by user organization. Default false = show all.',
  })
  @ApiQuery({
    name: 'work_id',
    required: false,
    type: String,
    description: 'Filter by work (obra) UUID',
  })
  @ApiResponse({ status: 200, description: 'Weekly attendance sheet' })
  getWeeklyAttendance(
    @Param('week_start_date') weekStartDate: string,
    @Request() req,
    @Query('filterByOrganization') filterByOrganization?: string,
    @Query('work_id') work_id?: string,
  ) {
    const filterByOrg = filterByOrganization === 'true' || filterByOrganization === '1';
    return this.attendanceService.getWeeklyAttendance(weekStartDate, req.user, filterByOrg, work_id);
  }

  @Get(':id')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get attendance by ID' })
  @ApiParam({ name: 'id', description: 'Attendance UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Attendance details' })
  @ApiResponse({ status: 404, description: 'Attendance not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.attendanceService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Update attendance record',
    description: 'Update attendance status or late hours.',
  })
  @ApiParam({ name: 'id', description: 'Attendance UUID', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateAttendanceDto })
  @ApiResponse({ status: 200, description: 'Attendance updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
    @Request() req,
  ) {
    return this.attendanceService.update(id, updateAttendanceDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Delete attendance record',
    description: 'Delete attendance. Only Administration and Direction can delete.',
  })
  @ApiParam({ name: 'id', description: 'Attendance UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Attendance deleted successfully' })
  remove(@Param('id') id: string, @Request() req) {
    return this.attendanceService.remove(id, req.user);
  }

  @Post('bulk')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Bulk create attendance records',
    description: 'Create multiple attendance records for a week (all employees).',
  })
  @ApiBody({ type: BulkAttendanceDto })
  @ApiResponse({ status: 201, description: 'Attendance records created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  bulkCreate(@Body() bulkDto: BulkAttendanceDto, @Request() req) {
    return this.attendanceService.bulkCreate(bulkDto, req.user);
  }
}
