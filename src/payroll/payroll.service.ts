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
import { ContractorCertificationsService } from '../contractor-certifications/contractor-certifications.service';
import { ContractorCertification } from '../contractor-certifications/contractor-certifications.entity';

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

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export type EmployeeAdvanceLineItemDto = {
  id: string;
  date: string;
  amount: number;
  description: string | null;
};

export type EmployeeReceiptDto = {
  type: 'employee';
  week_start_date: string;
  week_end_date: string;
  employee: {
    id: string;
    fullName: string;
    trade?: string | null;
    work?: { id?: string; name?: string } | null;
  };
  totals: {
    days_worked: number;
    total_salary: number;
    late_hours: number;
    late_deduction: number;
    total_advances: number;
    total_discounts: number;
    net_payment: number;
  };
  advances: EmployeeAdvanceLineItemDto[];
  meta: {
    payment_id: string;
    paid_at: string | null;
    expense_id: string | null;
  };
};

export type ContractorReceiptDto = {
  type: 'contractor';
  week_start_date: string;
  week_end_date: string;
  contractor: {
    id: string;
    name: string;
  };
  work: { id?: string; name?: string } | null;
  certification: {
    id: string;
    amount: number;
    description: string | null;
    expense_id: string | null;
  };
  balance: {
    contractor_remaining_balance: number | null;
    contractor_total_paid: number | null;
    contractor_budget: number | null;
  };
};

export type WeekReceiptsDto = {
  week_start_date: string;
  week_end_date: string;
  employees: EmployeeReceiptDto[];
  contractors: ContractorReceiptDto[];
};

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
    private readonly contractorCertificationsService: ContractorCertificationsService,
  ) {}

  private normalizeWeek(weekStartDate: string): { weekStart: Date; weekStr: string; weekEndStr: string } {
    const weekStart = getWeekStartDate(new Date(weekStartDate));
    const weekStr = toIsoDate(weekStart);
    const weekEndStr = toIsoDate(addDays(weekStart, 6));
    return { weekStart, weekStr, weekEndStr };
  }

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

  async getEmployeeReceipt(
    employeeId: string,
    weekStartDate: string,
    user: User,
    options?: { filterByOrganization?: boolean },
  ): Promise<EmployeeReceiptDto> {
    const { weekStr, weekEndStr } = this.normalizeWeek(weekStartDate);
    const organizationId = getOrganizationId(user);
    const filterByOrg = options?.filterByOrganization === true;

    const paymentQb = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.employee', 'employee')
      .leftJoinAndSelect('employee.work', 'work')
      .leftJoinAndSelect('payment.expense', 'expense')
      .where('payment.employee_id = :employee_id', { employee_id: employeeId })
      .andWhere('payment.week_start_date = :week_start_date', { week_start_date: weekStr });

    if (filterByOrg && organizationId) {
      paymentQb.andWhere('payment.organization_id = :organizationId', { organizationId });
    }

    const payment = await paymentQb.getOne();
    if (!payment) {
      throw new NotFoundException(
        `No hay pago calculado para el empleado ${employeeId} en la semana ${weekStr}`,
      );
    }

    const advancesQb = this.advancesRepository
      .createQueryBuilder('advance')
      .where('advance.employee_id = :employee_id', { employee_id: employeeId })
      .andWhere('advance.week_start_date = :week_start_date', { week_start_date: weekStr })
      .orderBy('advance.date', 'ASC')
      .addOrderBy('advance.created_at', 'ASC');

    if (filterByOrg && organizationId) {
      advancesQb.andWhere('advance.organization_id = :organizationId', { organizationId });
    }

    const advances = await advancesQb.getMany();
    const advanceItems: EmployeeAdvanceLineItemDto[] = advances.map((a) => ({
      id: a.id,
      date: toIsoDate(new Date(a.date)),
      amount: Number(a.amount ?? 0),
      description: a.description ?? null,
    }));

    const totalSalary = Number((payment as any).total_salary ?? 0);
    const lateHours = Number((payment as any).late_hours ?? 0);
    const lateDeduction = Number((payment as any).late_deduction ?? 0);
    const totalAdvances = advanceItems.reduce((sum, it) => sum + Number(it.amount ?? 0), 0);
    const totalDiscounts = totalAdvances + lateDeduction;
    const netPayment = Math.max(0, totalSalary - totalDiscounts);

    return {
      type: 'employee',
      week_start_date: weekStr,
      week_end_date: weekEndStr,
      employee: {
        id: payment.employee?.id ?? payment.employee_id,
        fullName: payment.employee?.fullName ?? payment.employee_id,
        trade: (payment.employee as any)?.trade ?? null,
        work: payment.employee?.work
          ? { id: (payment.employee.work as any).id, name: (payment.employee.work as any).name }
          : null,
      },
      totals: {
        days_worked: Number((payment as any).days_worked ?? 0),
        total_salary: totalSalary,
        late_hours: lateHours,
        late_deduction: lateDeduction,
        total_advances: totalAdvances,
        total_discounts: totalDiscounts,
        net_payment: netPayment,
      },
      advances: advanceItems,
      meta: {
        payment_id: payment.id,
        paid_at: payment.paid_at ? new Date(payment.paid_at).toISOString() : null,
        expense_id: payment.expense_id ?? null,
      },
    };
  }

  async getContractorReceipt(
    contractorId: string,
    weekStartDate: string,
    user: User,
    options?: { filterByOrganization?: boolean },
  ): Promise<ContractorReceiptDto> {
    const { weekStr, weekEndStr } = this.normalizeWeek(weekStartDate);
    const filterByOrg = options?.filterByOrganization === true;

    // Reutilizamos el servicio existente (ya trae supplier, contract.work, expense)
    const certs = await this.contractorCertificationsService.findAll(user, {
      filterByOrganization: filterByOrg,
      supplier_id: contractorId,
      week_start_date: weekStr,
    });

    const certification = (certs?.[0] as ContractorCertification | undefined) ?? undefined;
    if (!certification) {
      throw new NotFoundException(
        `No hay certificación para el contratista ${contractorId} en la semana ${weekStr}`,
      );
    }

    const supplier: any = (certification as any).supplier;
    const contract: any = (certification as any).contract;
    const work: any = contract?.work ?? null;

    return {
      type: 'contractor',
      week_start_date: weekStr,
      week_end_date: weekEndStr,
      contractor: {
        id: supplier?.id ?? contractorId,
        name: supplier?.name ?? contractorId,
      },
      work: work ? { id: work.id, name: work.name } : null,
      certification: {
        id: certification.id,
        amount: Number((certification as any).amount ?? 0),
        description: (certification as any).description ?? null,
        expense_id: (certification as any).expense_id ?? null,
      },
      balance: {
        contractor_remaining_balance:
          supplier?.contractor_remaining_balance !== undefined && supplier?.contractor_remaining_balance !== null
            ? Number(supplier.contractor_remaining_balance)
            : null,
        contractor_total_paid:
          supplier?.contractor_total_paid !== undefined && supplier?.contractor_total_paid !== null
            ? Number(supplier.contractor_total_paid)
            : null,
        contractor_budget:
          supplier?.contractor_budget !== undefined && supplier?.contractor_budget !== null
            ? Number(supplier.contractor_budget)
            : null,
      },
    };
  }

  async getWeekReceipts(
    weekStartDate: string,
    user: User,
    options?: { filterByOrganization?: boolean },
  ): Promise<WeekReceiptsDto> {
    const { weekStr, weekEndStr } = this.normalizeWeek(weekStartDate);
    const organizationId = getOrganizationId(user);
    const filterByOrg = options?.filterByOrganization === true;

    // Pagos de empleados de la semana
    const paymentsQb = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.employee', 'employee')
      .leftJoinAndSelect('employee.work', 'work')
      .leftJoinAndSelect('payment.expense', 'expense')
      .where('payment.week_start_date = :week_start_date', { week_start_date: weekStr })
      .orderBy('employee.fullName', 'ASC')
      .addOrderBy('payment.created_at', 'DESC');

    if (filterByOrg && organizationId) {
      paymentsQb.andWhere('payment.organization_id = :organizationId', { organizationId });
    }

    const payments = await paymentsQb.getMany();
    const employeeIds = payments.map((p) => p.employee_id).filter(Boolean);

    // Adelantos de la semana (para todos los empleados) para evitar N+1
    const advancesQb = this.advancesRepository
      .createQueryBuilder('advance')
      .where('advance.week_start_date = :week_start_date', { week_start_date: weekStr })
      .orderBy('advance.date', 'ASC')
      .addOrderBy('advance.created_at', 'ASC');

    if (employeeIds.length) {
      advancesQb.andWhere('advance.employee_id IN (:...employeeIds)', { employeeIds });
    } else {
      // No hay pagos => no hay recibos de empleados
      advancesQb.andWhere('1=0');
    }

    if (filterByOrg && organizationId) {
      advancesQb.andWhere('advance.organization_id = :organizationId', { organizationId });
    }

    const advances = await advancesQb.getMany();
    const advancesByEmployee = new Map<string, EmployeeAdvance[]>();
    for (const a of advances) {
      const arr = advancesByEmployee.get(a.employee_id) ?? [];
      arr.push(a);
      advancesByEmployee.set(a.employee_id, arr);
    }

    const employeeReceipts: EmployeeReceiptDto[] = payments.map((payment) => {
      const advs = advancesByEmployee.get(payment.employee_id) ?? [];
      const items: EmployeeAdvanceLineItemDto[] = advs.map((a) => ({
        id: a.id,
        date: toIsoDate(new Date(a.date)),
        amount: Number(a.amount ?? 0),
        description: a.description ?? null,
      }));

      const totalSalary = Number((payment as any).total_salary ?? 0);
      const lateDeduction = Number((payment as any).late_deduction ?? 0);
      const lateHours = Number((payment as any).late_hours ?? 0);
      const totalAdvances = items.reduce((sum, it) => sum + Number(it.amount ?? 0), 0);
      const totalDiscounts = totalAdvances + lateDeduction;
      const netPayment = Math.max(0, totalSalary - totalDiscounts);

      return {
        type: 'employee',
        week_start_date: weekStr,
        week_end_date: weekEndStr,
        employee: {
          id: payment.employee?.id ?? payment.employee_id,
          fullName: payment.employee?.fullName ?? payment.employee_id,
          trade: (payment.employee as any)?.trade ?? null,
          work: payment.employee?.work
            ? { id: (payment.employee.work as any).id, name: (payment.employee.work as any).name }
            : null,
        },
        totals: {
          days_worked: Number((payment as any).days_worked ?? 0),
          total_salary: totalSalary,
          late_hours: lateHours,
          late_deduction: lateDeduction,
          total_advances: totalAdvances,
          total_discounts: totalDiscounts,
          net_payment: netPayment,
        },
        advances: items,
        meta: {
          payment_id: payment.id,
          paid_at: payment.paid_at ? new Date(payment.paid_at).toISOString() : null,
          expense_id: payment.expense_id ?? null,
        },
      };
    });

    // Certificaciones de contratistas de la semana
    const certs = await this.contractorCertificationsService.findByWeek(weekStr, user, filterByOrg);
    const contractorReceipts: ContractorReceiptDto[] = (certs || []).map((cert: any) => {
      const supplier = cert.supplier;
      const work = cert.contract?.work ?? null;
      return {
        type: 'contractor',
        week_start_date: weekStr,
        week_end_date: weekEndStr,
        contractor: { id: supplier?.id ?? cert.supplier_id, name: supplier?.name ?? cert.supplier_id },
        work: work ? { id: work.id, name: work.name } : null,
        certification: {
          id: cert.id,
          amount: Number(cert.amount ?? 0),
          description: cert.description ?? null,
          expense_id: cert.expense_id ?? null,
        },
        balance: {
          contractor_remaining_balance:
            supplier?.contractor_remaining_balance !== undefined && supplier?.contractor_remaining_balance !== null
              ? Number(supplier.contractor_remaining_balance)
              : null,
          contractor_total_paid:
            supplier?.contractor_total_paid !== undefined && supplier?.contractor_total_paid !== null
              ? Number(supplier.contractor_total_paid)
              : null,
          contractor_budget:
            supplier?.contractor_budget !== undefined && supplier?.contractor_budget !== null
              ? Number(supplier.contractor_budget)
              : null,
        },
      };
    });

    return {
      week_start_date: weekStr,
      week_end_date: weekEndStr,
      employees: employeeReceipts,
      contractors: contractorReceipts,
    };
  }
}

