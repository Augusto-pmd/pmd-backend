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
import { EmployeeAdvancesService } from './employee-advances.service';
import { CreateEmployeeAdvanceDto } from './dto/create-employee-advance.dto';
import { UpdateEmployeeAdvanceDto } from './dto/update-employee-advance.dto';

@ApiTags('Employee Advances')
@ApiBearerAuth('JWT-auth')
@Controller('employee-advances')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeeAdvancesController {
  constructor(private readonly employeeAdvancesService: EmployeeAdvancesService) {}

  @Post()
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Create employee advance',
    description:
      'Register an employee advance. If week_start_date is omitted, it will be calculated from date (Monday).',
  })
  @ApiBody({ type: CreateEmployeeAdvanceDto })
  @ApiResponse({ status: 201, description: 'Employee advance created successfully' })
  create(@Body() dto: CreateEmployeeAdvanceDto, @Request() req) {
    return this.employeeAdvancesService.create(dto, req.user);
  }

  @Get()
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'List employee advances',
    description:
      'List advances. By default shows all. Use filterByOrganization=true to filter by user organization.',
  })
  @ApiQuery({
    name: 'filterByOrganization',
    required: false,
    type: Boolean,
    description: 'If true, filter by user organization. Default false = show all.',
  })
  @ApiQuery({
    name: 'employee_id',
    required: false,
    type: String,
    description: 'Filter by employee UUID',
  })
  @ApiQuery({
    name: 'week_start_date',
    required: false,
    type: String,
    description: 'Filter by week start date (Monday)',
  })
  @ApiResponse({ status: 200, description: 'List of employee advances' })
  findAll(
    @Request() req,
    @Query('filterByOrganization') filterByOrganization?: string,
    @Query('employee_id') employee_id?: string,
    @Query('week_start_date') week_start_date?: string,
  ) {
    const filterByOrg = filterByOrganization === 'true' || filterByOrganization === '1';
    return this.employeeAdvancesService.findAll(req.user, {
      filterByOrganization: filterByOrg,
      employee_id: employee_id || undefined,
      week_start_date: week_start_date || undefined,
    });
  }

  @Get('employee/:employee_id')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get advances by employee' })
  @ApiParam({ name: 'employee_id', description: 'Employee UUID', type: String, format: 'uuid' })
  @ApiQuery({
    name: 'filterByOrganization',
    required: false,
    type: Boolean,
    description: 'If true, filter by user organization. Default false = show all.',
  })
  findByEmployee(
    @Param('employee_id') employeeId: string,
    @Request() req,
    @Query('filterByOrganization') filterByOrganization?: string,
  ) {
    const filterByOrg = filterByOrganization === 'true' || filterByOrganization === '1';
    return this.employeeAdvancesService.findByEmployee(employeeId, req.user, filterByOrg);
  }

  @Get('week/:week_start_date')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get advances by week (week_start_date)' })
  @ApiParam({ name: 'week_start_date', description: 'Week start date (Monday)', example: '2024-01-15' })
  @ApiQuery({
    name: 'filterByOrganization',
    required: false,
    type: Boolean,
    description: 'If true, filter by user organization. Default false = show all.',
  })
  findByWeek(
    @Param('week_start_date') weekStartDate: string,
    @Request() req,
    @Query('filterByOrganization') filterByOrganization?: string,
  ) {
    const filterByOrg = filterByOrganization === 'true' || filterByOrganization === '1';
    return this.employeeAdvancesService.findByWeek(weekStartDate, req.user, filterByOrg);
  }

  @Get(':id')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get employee advance by ID' })
  @ApiParam({ name: 'id', description: 'EmployeeAdvance UUID', type: String, format: 'uuid' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.employeeAdvancesService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Update employee advance' })
  @ApiParam({ name: 'id', description: 'EmployeeAdvance UUID', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateEmployeeAdvanceDto })
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeAdvanceDto, @Request() req) {
    return this.employeeAdvancesService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Delete employee advance',
    description: 'Only Administration and Direction can delete.',
  })
  @ApiParam({ name: 'id', description: 'EmployeeAdvance UUID', type: String, format: 'uuid' })
  remove(@Param('id') id: string, @Request() req) {
    return this.employeeAdvancesService.remove(id, req.user);
  }
}

