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
import { EmployeeTrade } from '../common/enums/employee-trade.enum';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@ApiTags('Employees')
@ApiBearerAuth('JWT-auth')
@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Create employee',
    description: 'Create a new employee. Only Administration and Direction can create.',
  })
  @ApiBody({ type: CreateEmployeeDto })
  @ApiResponse({ status: 201, description: 'Employee created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() createEmployeeDto: CreateEmployeeDto, @Request() req) {
    return this.employeesService.create(createEmployeeDto, req.user);
  }

  @Get()
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Get all employees',
    description:
      'List employees. By default shows all. Use filterByOrganization=true to filter by user organization.',
  })
  @ApiQuery({
    name: 'filterByOrganization',
    required: false,
    type: Boolean,
    description:
      'If true, filter by user organization. Default false = show all.',
  })
  @ApiQuery({
    name: 'work_id',
    required: false,
    type: String,
    description: 'Filter by work (obra) UUID',
  })
  @ApiQuery({
    name: 'trade',
    required: false,
    enum: EmployeeTrade,
    description: 'Filter by trade (rubro)',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiResponse({ status: 200, description: 'List of employees' })
  findAll(
    @Request() req,
    @Query('filterByOrganization') filterByOrganization?: string,
    @Query('work_id') work_id?: string,
    @Query('trade') trade?: EmployeeTrade,
    @Query('isActive') isActive?: string,
  ) {
    const filterByOrg =
      filterByOrganization === 'true' || filterByOrganization === '1';
    const isActiveBool =
      isActive === undefined
        ? undefined
        : isActive === 'true' || isActive === '1';
    return this.employeesService.findAll(req.user, {
      filterByOrganization: filterByOrg,
      work_id: work_id || undefined,
      trade: trade || undefined,
      isActive: isActiveBool,
    });
  }

  @Get(':id')
  @Roles(UserRole.OPERATOR, UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiParam({ name: 'id', description: 'Employee UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Employee details' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.employeesService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Update employee',
    description: 'Update employee. Only Administration and Direction can update.',
  })
  @ApiParam({ name: 'id', description: 'Employee UUID', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateEmployeeDto })
  @ApiResponse({ status: 200, description: 'Employee updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @Request() req,
  ) {
    return this.employeesService.update(id, updateEmployeeDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Delete employee',
    description: 'Permanently delete employee from database. Cascades to attendance, advances and payments. Only Direction can delete.',
  })
  @ApiParam({ name: 'id', description: 'Employee UUID', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Employee deleted successfully' })
  remove(@Param('id') id: string, @Request() req) {
    return this.employeesService.remove(id, req.user);
  }
}
