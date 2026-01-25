import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeePayment } from './employee-payments.entity';
import { Employee } from '../employees/employees.entity';
import { Attendance } from '../attendance/attendance.entity';
import { EmployeeAdvance } from '../employee-advances/employee-advances.entity';
import { AttendanceStatus } from '../common/enums/attendance-status.enum';
import { User } from '../users/user.entity';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';
import { ExpensesService } from '../expenses/expenses.service';

function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException('Fecha inválida');
  }
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    @InjectRepository(EmployeePayment)
    private readonly paymentsRepository: Repository<EmployeePayment>,
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(EmployeeAdvance)
    private readonly advancesRepository: Repository<EmployeeAdvance>,
    private readonly expensesService: ExpensesService,
  ) {}

  async calculateWeek(
    weekStartDate: string,
    user: User,
    options?: {
      filterByOrganization?: boolean;
      createExpenses?: boolean;
      work_id?: string;
    },
  ): Promise<EmployeePayment[]> {
    const weekStart = getWeekStartDate(new Date(weekStartDate));
    const weekStr = toIsoDate(weekStart);

    const organizationId = getOrganizationId(user);
    const filterByOrg = options?.filterByOrganization === true;
    const createExpenses = options?.createExpenses !== false;

    // Empleados activos (por defecto: todos; opcionalmente filtrar por organización)
    const empQb = this.employeesRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.work', 'work')
      .where('employee.isActive = :active', { active: true })
      .orderBy('employee.created_at', 'DESC');

    if (filterByOrg && organizationId) {
      empQb.andWhere('employee.organization_id = :organizationId', { organizationId });
    }

    if (options?.work_id) {
      empQb.andWhere('employee.work_id = :work_id', { work_id: options.work_id });
    }

    const employees = await empQb.getMany();
    if (!employees.length) {
      return [];
    }

    const employeeIds = employees.map((e) => e.id);

    // Asistencias de la semana (solo para esos empleados)
    const attendance = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.week_start_date = :week_start_date', { week_start_date: weekStr })
      .andWhere('attendance.employee_id IN (:...employeeIds)', { employeeIds })
      .getMany();

    const attendanceByEmployee = new Map<string, Attendance[]>();
    for (const a of attendance) {
      const arr = attendanceByEmployee.get(a.employee_id) ?? [];
      arr.push(a);
      attendanceByEmployee.set(a.employee_id, arr);
    }

    // Adelantos de la semana (solo para esos empleados)
    const advances = await this.advancesRepository
      .createQueryBuilder('advance')
      .where('advance.week_start_date = :week_start_date', { week_start_date: weekStr })
      .andWhere('advance.employee_id IN (:...employeeIds)', { employeeIds })
      .getMany();

    const advancesTotalByEmployee = new Map<string, number>();
    for (const adv of advances) {
      const current = advancesTotalByEmployee.get(adv.employee_id) ?? 0;
      advancesTotalByEmployee.set(adv.employee_id, current + Number(adv.amount ?? 0));
    }

    // Pagos existentes para idempotencia (recalcular/actualizar valores)
    const existingPayments = await this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.employee', 'employee')
      .leftJoinAndSelect('payment.expense', 'expense')
      .where('payment.week_start_date = :week_start_date', { week_start_date: weekStr })
      .andWhere('payment.employee_id IN (:...employeeIds)', { employeeIds })
      .getMany();

    const existingByEmployee = new Map<string, EmployeePayment>();
    for (const p of existingPayments) {
      existingByEmployee.set(p.employee_id, p);
    }

    const savedPayments: EmployeePayment[] = [];

    for (const emp of employees) {
      const empAttendance = attendanceByEmployee.get(emp.id) ?? [];
      const daysWorked = empAttendance.filter(
        (a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE,
      ).length;

      const lateHours = empAttendance.reduce((sum, a) => {
        if (a.status !== AttendanceStatus.LATE) return sum;
        return sum + Number(a.late_hours ?? 0);
      }, 0);

      const dailySalary = Number(emp.daily_salary ?? 0);
      const totalSalary = daysWorked * dailySalary;
      const lateDeduction = dailySalary > 0 ? (lateHours / 8) * dailySalary : 0;
      const totalAdvances = advancesTotalByEmployee.get(emp.id) ?? 0;

      // Nunca crear gastos con monto negativo: pago neto mínimo 0
      const netPayment = Math.max(0, totalSalary - lateDeduction - totalAdvances);

      const existing = existingByEmployee.get(emp.id);

      const payment = existing
        ? Object.assign(existing, {
            days_worked: daysWorked,
            total_salary: totalSalary,
            late_hours: lateHours > 0 ? lateHours : null,
            late_deduction: lateDeduction,
            total_advances: totalAdvances,
            net_payment: netPayment,
          })
        : this.paymentsRepository.create({
            employee_id: emp.id,
            week_start_date: weekStart,
            days_worked: daysWorked,
            total_salary: totalSalary,
            late_hours: lateHours > 0 ? lateHours : null,
            late_deduction: lateDeduction,
            total_advances: totalAdvances,
            net_payment: netPayment,
            paid_at: null,
            // Preferimos preservar la organización del empleado si existe
            organization_id: emp.organization_id ?? organizationId,
          });

      const saved = await this.paymentsRepository.save(payment);
      // Evitar refetch: mantener referencia a empleado para el response cuando existe
      (saved as any).employee = (existing?.employee ?? emp) as any;
      savedPayments.push(saved);
    }

    if (createExpenses) {
      for (const payment of savedPayments) {
        try {
          if (!payment.expense_id) {
            // Crea gasto solo si falta. Para actualizar un gasto existente, usar endpoint manual.
            await this.expensesService.createFromEmployeePayment(payment.id, user);
          }
        } catch (err: unknown) {
          // No abortar el cálculo completo si un empleado no tiene obra asignada, etc.
          this.logger.warn(
            `No se pudo crear gasto automático para payment ${payment.id}: ${
              err instanceof Error ? err.message : 'error'
            }`,
          );
        }
      }
    }

    // Retornar con relaciones frescas (incluye expense_id actualizado si se creó gasto)
    const qb = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.employee', 'employee')
      .leftJoinAndSelect('employee.work', 'work')
      .leftJoinAndSelect('payment.expense', 'expense')
      .where('payment.week_start_date = :week_start_date', { week_start_date: weekStr })
      .andWhere('payment.employee_id IN (:...employeeIds)', { employeeIds })
      .orderBy('payment.net_payment', 'DESC')
      .addOrderBy('payment.created_at', 'DESC');

    if (filterByOrg && organizationId) {
      qb.andWhere('payment.organization_id = :organizationId', { organizationId });
    }

    if (options?.work_id) {
      qb.andWhere('employee.work_id = :work_id', { work_id: options.work_id });
    }

    return await qb.getMany();
  }

  async getWeek(
    weekStartDate: string,
    user: User,
    options?: { filterByOrganization?: boolean; work_id?: string },
  ): Promise<EmployeePayment[]> {
    const weekStart = getWeekStartDate(new Date(weekStartDate));
    const weekStr = toIsoDate(weekStart);

    const organizationId = getOrganizationId(user);
    const filterByOrg = options?.filterByOrganization === true;

    const qb = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.employee', 'employee')
      .leftJoinAndSelect('employee.work', 'work')
      .leftJoinAndSelect('payment.expense', 'expense')
      .where('payment.week_start_date = :week_start_date', { week_start_date: weekStr })
      .orderBy('payment.net_payment', 'DESC')
      .addOrderBy('payment.created_at', 'DESC');

    if (filterByOrg && organizationId) {
      qb.andWhere('payment.organization_id = :organizationId', { organizationId });
    }

    if (options?.work_id) {
      qb.andWhere('employee.work_id = :work_id', { work_id: options.work_id });
    }

    return await qb.getMany();
  }

  async getByEmployee(
    employeeId: string,
    user: User,
    options?: { filterByOrganization?: boolean },
  ): Promise<EmployeePayment[]> {
    const organizationId = getOrganizationId(user);
    const filterByOrg = options?.filterByOrganization === true;

    const qb = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.employee', 'employee')
      .leftJoinAndSelect('payment.expense', 'expense')
      .where('payment.employee_id = :employee_id', { employee_id: employeeId })
      .orderBy('payment.week_start_date', 'DESC');

    if (filterByOrg && organizationId) {
      qb.andWhere('payment.organization_id = :organizationId', { organizationId });
    }

    return await qb.getMany();
  }

  async markPaid(id: string, user: User): Promise<EmployeePayment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: ['employee', 'expense'],
    });

    if (!payment) {
      throw new NotFoundException(`EmployeePayment with ID ${id} not found`);
    }

    if (payment.paid_at) {
      return payment;
    }

    payment.paid_at = new Date();
    await this.paymentsRepository.save(payment);
    return await this.paymentsRepository.findOne({
      where: { id },
      relations: ['employee', 'expense'],
    });
  }

  async summary(
    user: User,
    options?: { filterByOrganization?: boolean; work_id?: string },
  ): Promise<
    Array<{
      week_start_date: string;
      total_payments: number;
      unpaid_payments: number;
      total_net_payment: number;
      missing_expense: number;
    }>
  > {
    const organizationId = getOrganizationId(user);
    const filterByOrg = options?.filterByOrganization === true;

    const qb = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoin('payment.employee', 'employee')
      .select('payment.week_start_date', 'week_start_date')
      .addSelect('COUNT(*)', 'total_payments')
      .addSelect(
        `SUM(CASE WHEN payment.paid_at IS NULL THEN 1 ELSE 0 END)`,
        'unpaid_payments',
      )
      .addSelect(`COALESCE(SUM(payment.net_payment), 0)`, 'total_net_payment')
      .addSelect(
        `SUM(CASE WHEN payment.expense_id IS NULL THEN 1 ELSE 0 END)`,
        'missing_expense',
      )
      .groupBy('payment.week_start_date')
      .orderBy('payment.week_start_date', 'DESC');

    if (filterByOrg && organizationId) {
      qb.where('payment.organization_id = :organizationId', { organizationId });
    }

    if (options?.work_id) {
      qb.andWhere('employee.work_id = :work_id', { work_id: options.work_id });
    }

    const rows = await qb.getRawMany<{
      week_start_date: string;
      total_payments: string;
      unpaid_payments: string;
      total_net_payment: string;
      missing_expense: string;
    }>();

    return rows.map((r) => ({
      week_start_date: r.week_start_date,
      total_payments: Number(r.total_payments ?? 0),
      unpaid_payments: Number(r.unpaid_payments ?? 0),
      total_net_payment: Number(r.total_net_payment ?? 0),
      missing_expense: Number(r.missing_expense ?? 0),
    }));
  }
}

