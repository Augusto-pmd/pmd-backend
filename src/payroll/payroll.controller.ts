import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { PayrollService } from './payroll.service';

@ApiTags('Payroll')
@ApiBearerAuth('JWT-auth')
@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('calculate/:week_start_date')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Calcular pagos semanales de una semana (crea gastos automáticamente)',
  })
  @ApiParam({
    name: 'week_start_date',
    description: 'Fecha lunes de la semana (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @ApiQuery({
    name: 'filterByOrganization',
    required: false,
    type: Boolean,
    description: 'Si true, calcula/lista solo para la organización del usuario.',
  })
  @ApiQuery({
    name: 'createExpenses',
    required: false,
    type: Boolean,
    description: 'Si false, no crea gastos automáticamente (solo calcula pagos).',
  })
  @ApiResponse({ status: 201, description: 'Pagos calculados' })
  calculate(
    @Param('week_start_date') weekStartDate: string,
    @Request() req,
    @Query('filterByOrganization') filterByOrganization?: string,
    @Query('createExpenses') createExpenses?: string,
    @Query('work_id') work_id?: string,
  ) {
    const filterByOrg = filterByOrganization === 'true' || filterByOrganization === '1';
    const createExp = createExpenses === undefined ? true : createExpenses === 'true' || createExpenses === '1';
    return this.payrollService.calculateWeek(weekStartDate, req.user, {
      filterByOrganization: filterByOrg,
      createExpenses: createExp,
      work_id: work_id || undefined,
    });
  }

  @Get('week/:week_start_date')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Obtener pagos de una semana' })
  @ApiParam({
    name: 'week_start_date',
    description: 'Fecha lunes de la semana (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @ApiQuery({
    name: 'filterByOrganization',
    required: false,
    type: Boolean,
    description: 'Si true, filtra por la organización del usuario.',
  })
  @ApiQuery({
    name: 'work_id',
    required: false,
    type: String,
    description: 'Filtrar por obra (work_id)',
  })
  getWeek(
    @Param('week_start_date') weekStartDate: string,
    @Request() req,
    @Query('filterByOrganization') filterByOrganization?: string,
    @Query('work_id') work_id?: string,
  ) {
    const filterByOrg = filterByOrganization === 'true' || filterByOrganization === '1';
    return this.payrollService.getWeek(weekStartDate, req.user, {
      filterByOrganization: filterByOrg,
      work_id: work_id || undefined,
    });
  }

  @Get('employee/:employee_id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Historial de pagos de un empleado' })
  @ApiParam({ name: 'employee_id', description: 'Employee UUID', type: String, format: 'uuid' })
  @ApiQuery({
    name: 'filterByOrganization',
    required: false,
    type: Boolean,
    description: 'Si true, filtra por la organización del usuario.',
  })
  getByEmployee(
    @Param('employee_id') employeeId: string,
    @Request() req,
    @Query('filterByOrganization') filterByOrganization?: string,
  ) {
    const filterByOrg = filterByOrganization === 'true' || filterByOrganization === '1';
    return this.payrollService.getByEmployee(employeeId, req.user, { filterByOrganization: filterByOrg });
  }

  @Post('mark-paid/:id')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Marcar pago como realizado' })
  @ApiParam({ name: 'id', description: 'EmployeePayment UUID', type: String, format: 'uuid' })
  markPaid(@Param('id') id: string, @Request() req) {
    return this.payrollService.markPaid(id, req.user);
  }

  @Get('summary')
  @Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Resumen de pagos (pendientes/total por semana)' })
  @ApiQuery({
    name: 'filterByOrganization',
    required: false,
    type: Boolean,
    description: 'Si true, filtra por la organización del usuario.',
  })
  @ApiQuery({
    name: 'work_id',
    required: false,
    type: String,
    description: 'Filtrar por obra (work_id)',
  })
  summary(
    @Request() req,
    @Query('filterByOrganization') filterByOrganization?: string,
    @Query('work_id') work_id?: string,
  ) {
    const filterByOrg = filterByOrganization === 'true' || filterByOrganization === '1';
    return this.payrollService.summary(req.user, {
      filterByOrganization: filterByOrg,
      work_id: work_id || undefined,
    });
  }

  @Get('receipts/employee/:employee_id/week/:week_start_date')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Recibo imprimible de empleado (semana)' })
  @ApiParam({ name: 'employee_id', description: 'Employee UUID', type: String, format: 'uuid' })
  @ApiParam({
    name: 'week_start_date',
    description: 'Fecha lunes de la semana (YYYY-MM-DD) o cualquier fecha dentro de la semana',
    example: '2026-01-19',
  })
  @ApiQuery({
    name: 'filterByOrganization',
    required: false,
    type: Boolean,
    description: 'Si true, filtra por la organización del usuario.',
  })
  @ApiResponse({ status: 200, description: 'Recibo de sueldo' })
  getEmployeeReceipt(
    @Param('employee_id') employeeId: string,
    @Param('week_start_date') weekStartDate: string,
    @Request() req,
    @Query('filterByOrganization') filterByOrganization?: string,
  ) {
    const filterByOrg = filterByOrganization === 'true' || filterByOrganization === '1';
    return this.payrollService.getEmployeeReceipt(employeeId, weekStartDate, req.user, {
      filterByOrganization: filterByOrg,
    });
  }

  @Get('receipts/contractor/:contractor_id/week/:week_start_date')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Recibo imprimible de certificación de contratista (semana)' })
  @ApiParam({
    name: 'contractor_id',
    description: 'Supplier UUID (type=CONTRACTOR)',
    type: String,
    format: 'uuid',
  })
  @ApiParam({
    name: 'week_start_date',
    description: 'Fecha lunes de la semana (YYYY-MM-DD) o cualquier fecha dentro de la semana',
    example: '2026-01-19',
  })
  @ApiQuery({
    name: 'filterByOrganization',
    required: false,
    type: Boolean,
    description: 'Si true, filtra por la organización del usuario.',
  })
  @ApiResponse({ status: 200, description: 'Recibo de certificación' })
  getContractorReceipt(
    @Param('contractor_id') contractorId: string,
    @Param('week_start_date') weekStartDate: string,
    @Request() req,
    @Query('filterByOrganization') filterByOrganization?: string,
  ) {
    const filterByOrg = filterByOrganization === 'true' || filterByOrganization === '1';
    return this.payrollService.getContractorReceipt(contractorId, weekStartDate, req.user, {
      filterByOrganization: filterByOrg,
    });
  }

  @Get('receipts/week/:week_start_date')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({ summary: 'Todos los recibos de una semana (empleados + contratistas)' })
  @ApiParam({
    name: 'week_start_date',
    description: 'Fecha lunes de la semana (YYYY-MM-DD) o cualquier fecha dentro de la semana',
    example: '2026-01-19',
  })
  @ApiQuery({
    name: 'filterByOrganization',
    required: false,
    type: Boolean,
    description: 'Si true, filtra por la organización del usuario.',
  })
  @ApiResponse({ status: 200, description: 'Recibos de la semana' })
  getWeekReceipts(
    @Param('week_start_date') weekStartDate: string,
    @Request() req,
    @Query('filterByOrganization') filterByOrganization?: string,
  ) {
    const filterByOrg = filterByOrganization === 'true' || filterByOrganization === '1';
    return this.payrollService.getWeekReceipts(weekStartDate, req.user, {
      filterByOrganization: filterByOrg,
    });
  }

  @Get('receipts/print/:type/:week_start_date')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
  @ApiOperation({
    summary: 'Recibos para imprimir (empleados/contratistas/todos) de una semana',
  })
  @ApiParam({
    name: 'type',
    description: 'Tipo de impresión: employees | contractors | all',
    example: 'all',
  })
  @ApiParam({
    name: 'week_start_date',
    description: 'Fecha lunes de la semana (YYYY-MM-DD) o cualquier fecha dentro de la semana',
    example: '2026-01-19',
  })
  @ApiQuery({
    name: 'filterByOrganization',
    required: false,
    type: Boolean,
    description: 'Si true, filtra por la organización del usuario.',
  })
  @ApiResponse({ status: 200, description: 'Recibos listos para imprimir' })
  async getReceiptsToPrint(
    @Param('type') type: string,
    @Param('week_start_date') weekStartDate: string,
    @Request() req,
    @Query('filterByOrganization') filterByOrganization?: string,
  ) {
    const filterByOrg = filterByOrganization === 'true' || filterByOrganization === '1';
    const normalized = String(type || '').toLowerCase();
    const receipts = await this.payrollService.getWeekReceipts(weekStartDate, req.user, {
      filterByOrganization: filterByOrg,
    });

    if (normalized === 'employees' || normalized === 'empleados' || normalized === 'employee') {
      return { ...receipts, type: 'employees', items: receipts.employees };
    }
    if (normalized === 'contractors' || normalized === 'contratistas' || normalized === 'contractor') {
      return { ...receipts, type: 'contractors', items: receipts.contractors };
    }
    return { ...receipts, type: 'all', items: [...receipts.employees, ...receipts.contractors] };
  }
}

