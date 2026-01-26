import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayrollService } from './payroll.service';
import { EmployeePayment } from './employee-payments.entity';
import { Employee } from '../employees/employees.entity';
import { Attendance } from '../attendance/attendance.entity';
import { EmployeeAdvance } from '../employee-advances/employee-advances.entity';
import { ExpensesService } from '../expenses/expenses.service';
import { ContractorCertificationsService } from '../contractor-certifications/contractor-certifications.service';
import { AttendanceStatus } from '../common/enums/attendance-status.enum';
import { User } from '../users/user.entity';
import { createMockUser } from '../common/test/test-helpers';
import { UserRole } from '../common/enums/user-role.enum';

describe('PayrollService', () => {
  let service: PayrollService;
  let paymentsRepository: Repository<EmployeePayment>;
  let employeesRepository: Repository<Employee>;
  let attendanceRepository: Repository<Attendance>;
  let advancesRepository: Repository<EmployeeAdvance>;
  let expensesService: ExpensesService;
  let contractorCertificationsService: ContractorCertificationsService;

  const mockPaymentsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockEmployeesRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockAttendanceRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockAdvancesRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockExpensesService = {
    createFromEmployeePayment: jest.fn(),
  };

  const mockContractorCertificationsService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        {
          provide: getRepositoryToken(EmployeePayment),
          useValue: mockPaymentsRepository,
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: mockEmployeesRepository,
        },
        {
          provide: getRepositoryToken(Attendance),
          useValue: mockAttendanceRepository,
        },
        {
          provide: getRepositoryToken(EmployeeAdvance),
          useValue: mockAdvancesRepository,
        },
        {
          provide: ExpensesService,
          useValue: mockExpensesService,
        },
        {
          provide: ContractorCertificationsService,
          useValue: mockContractorCertificationsService,
        },
      ],
    }).compile();

    service = module.get<PayrollService>(PayrollService);
    paymentsRepository = module.get<Repository<EmployeePayment>>(getRepositoryToken(EmployeePayment));
    employeesRepository = module.get<Repository<Employee>>(getRepositoryToken(Employee));
    attendanceRepository = module.get<Repository<Attendance>>(getRepositoryToken(Attendance));
    advancesRepository = module.get<Repository<EmployeeAdvance>>(getRepositoryToken(EmployeeAdvance));
    expensesService = module.get<ExpensesService>(ExpensesService);
    contractorCertificationsService = module.get<ContractorCertificationsService>(ContractorCertificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateWeek - Cálculo de nómina', () => {
    const mockUser = createMockUser({ role: { name: UserRole.DIRECTION } });
    const weekStartDate = '2024-01-15'; // Lunes
    const weekStr = '2024-01-15';

    it('debe calcular días trabajados correctamente', async () => {
      const mockEmployee: Partial<Employee> = {
        id: 'emp-1',
        fullName: 'Empleado Test',
        daily_salary: 10000,
        isActive: true,
        organization_id: 'org-1',
      };

      const mockAttendance: Attendance[] = [
        {
          id: 'att-1',
          employee_id: 'emp-1',
          date: new Date('2024-01-15'),
          status: AttendanceStatus.PRESENT,
          late_hours: null,
          week_start_date: new Date(weekStr),
          organization_id: 'org-1',
        } as Attendance,
        {
          id: 'att-2',
          employee_id: 'emp-1',
          date: new Date('2024-01-16'),
          status: AttendanceStatus.PRESENT,
          late_hours: null,
          week_start_date: new Date(weekStr),
          organization_id: 'org-1',
        } as Attendance,
        {
          id: 'att-3',
          employee_id: 'emp-1',
          date: new Date('2024-01-17'),
          status: AttendanceStatus.ABSENT,
          late_hours: null,
          week_start_date: new Date(weekStr),
          organization_id: 'org-1',
        } as Attendance,
      ];

      // Crear QueryBuilders separados para cada repositorio
      const mockEmployeesQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockEmployee as Employee]),
      };

      const mockAttendanceQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAttendance),
      };

      const mockAdvancesQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      const mockPaymentsQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn()
          .mockResolvedValueOnce([]) // existing payments
          .mockResolvedValueOnce([]), // final query
      };

      mockEmployeesRepository.createQueryBuilder.mockReturnValue(mockEmployeesQb as any);
      mockAttendanceRepository.createQueryBuilder.mockReturnValue(mockAttendanceQb as any);
      mockAdvancesRepository.createQueryBuilder.mockReturnValue(mockAdvancesQb as any);
      mockPaymentsRepository.createQueryBuilder.mockReturnValue(mockPaymentsQb as any);

      mockPaymentsRepository.create.mockReturnValue({
        employee_id: 'emp-1',
        week_start_date: new Date(weekStr),
        days_worked: 2,
        total_salary: 20000,
        late_hours: null,
        late_deduction: 0,
        total_advances: 0,
        net_payment: 20000,
      });

      mockPaymentsRepository.save.mockResolvedValue({
        id: 'pay-1',
        employee_id: 'emp-1',
        days_worked: 2,
        total_salary: 20000,
        net_payment: 20000,
      });

      const result = await service.calculateWeek(weekStartDate, mockUser, { createExpenses: false });

      expect(result).toBeDefined();
      // Verificar que se calculó correctamente: 2 días trabajados (PRESENT)
      expect(mockPaymentsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: 'emp-1',
          days_worked: 2,
          total_salary: 20000, // 2 días × 10000
        }),
      );
    });

    it('debe calcular descuento por tardanzas correctamente', async () => {
      const mockEmployee: Partial<Employee> = {
        id: 'emp-1',
        fullName: 'Empleado Test',
        daily_salary: 10000,
        isActive: true,
        organization_id: 'org-1',
      };

      const mockAttendance: Attendance[] = [
        {
          id: 'att-1',
          employee_id: 'emp-1',
          date: new Date('2024-01-15'),
          status: AttendanceStatus.LATE,
          late_hours: 2, // 2 horas de tardanza
          week_start_date: new Date(weekStr),
          organization_id: 'org-1',
        } as Attendance,
        {
          id: 'att-2',
          employee_id: 'emp-1',
          date: new Date('2024-01-16'),
          status: AttendanceStatus.PRESENT,
          late_hours: null,
          week_start_date: new Date(weekStr),
          organization_id: 'org-1',
        } as Attendance,
      ];

      const mockEmployeesQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockEmployee as Employee]),
      };

      const mockAttendanceQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAttendance),
      };

      const mockAdvancesQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      const mockPaymentsQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn()
          .mockResolvedValueOnce([]) // existing payments
          .mockResolvedValueOnce([]), // final query
      };

      mockEmployeesRepository.createQueryBuilder.mockReturnValue(mockEmployeesQb as any);
      mockAttendanceRepository.createQueryBuilder.mockReturnValue(mockAttendanceQb as any);
      mockAdvancesRepository.createQueryBuilder.mockReturnValue(mockAdvancesQb as any);
      mockPaymentsRepository.createQueryBuilder.mockReturnValue(mockPaymentsQb as any);

      // late_deduction = (2 horas / 8) * 10000 = 2500
      mockPaymentsRepository.create.mockReturnValue({
        employee_id: 'emp-1',
        week_start_date: new Date(weekStr),
        days_worked: 2,
        total_salary: 20000,
        late_hours: 2,
        late_deduction: 2500,
        total_advances: 0,
        net_payment: 17500, // 20000 - 2500
      });

      mockPaymentsRepository.save.mockResolvedValue({
        id: 'pay-1',
        employee_id: 'emp-1',
        days_worked: 2,
        late_hours: 2,
        late_deduction: 2500,
        net_payment: 17500,
      });

      await service.calculateWeek(weekStartDate, mockUser, { createExpenses: false });

      expect(mockPaymentsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: 'emp-1',
          late_hours: 2,
          late_deduction: 2500, // (2/8) * 10000
          net_payment: 17500, // 20000 - 2500
        }),
      );
    });

    it('debe descontar adelantos correctamente', async () => {
      const mockEmployee: Partial<Employee> = {
        id: 'emp-1',
        fullName: 'Empleado Test',
        daily_salary: 10000,
        isActive: true,
        organization_id: 'org-1',
      };

      const mockAttendance: Attendance[] = [
        {
          id: 'att-1',
          employee_id: 'emp-1',
          date: new Date('2024-01-15'),
          status: AttendanceStatus.PRESENT,
          late_hours: null,
          week_start_date: new Date(weekStr),
          organization_id: 'org-1',
        } as Attendance,
      ];

      const mockAdvances: EmployeeAdvance[] = [
        {
          id: 'adv-1',
          employee_id: 'emp-1',
          amount: 5000,
          date: new Date('2024-01-16'),
          week_start_date: new Date(weekStr),
          organization_id: 'org-1',
        } as EmployeeAdvance,
        {
          id: 'adv-2',
          employee_id: 'emp-1',
          amount: 3000,
          date: new Date('2024-01-17'),
          week_start_date: new Date(weekStr),
          organization_id: 'org-1',
        } as EmployeeAdvance,
      ];

      const mockEmployeesQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockEmployee as Employee]),
      };

      const mockAttendanceQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAttendance),
      };

      const mockAdvancesQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAdvances),
      };

      const mockPaymentsQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn()
          .mockResolvedValueOnce([]) // existing payments
          .mockResolvedValueOnce([]), // final query
      };

      mockEmployeesRepository.createQueryBuilder.mockReturnValue(mockEmployeesQb as any);
      mockAttendanceRepository.createQueryBuilder.mockReturnValue(mockAttendanceQb as any);
      mockAdvancesRepository.createQueryBuilder.mockReturnValue(mockAdvancesQb as any);
      mockPaymentsRepository.createQueryBuilder.mockReturnValue(mockPaymentsQb as any);

      // total_advances = 5000 + 3000 = 8000
      mockPaymentsRepository.create.mockReturnValue({
        employee_id: 'emp-1',
        week_start_date: new Date(weekStr),
        days_worked: 1,
        total_salary: 10000,
        late_hours: null,
        late_deduction: 0,
        total_advances: 8000,
        net_payment: 2000, // 10000 - 8000
      });

      mockPaymentsRepository.save.mockResolvedValue({
        id: 'pay-1',
        employee_id: 'emp-1',
        total_advances: 8000,
        net_payment: 2000,
      });

      await service.calculateWeek(weekStartDate, mockUser, { createExpenses: false });

      expect(mockPaymentsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: 'emp-1',
          total_advances: 8000,
          net_payment: 2000, // 10000 - 8000
        }),
      );
    });

    it('debe calcular pago neto correctamente con todos los descuentos', async () => {
      const mockEmployee: Partial<Employee> = {
        id: 'emp-1',
        fullName: 'Empleado Test',
        daily_salary: 10000,
        isActive: true,
        organization_id: 'org-1',
      };

      const mockAttendance: Attendance[] = [
        {
          id: 'att-1',
          employee_id: 'emp-1',
          date: new Date('2024-01-15'),
          status: AttendanceStatus.LATE,
          late_hours: 4, // 4 horas de tardanza
          week_start_date: new Date(weekStr),
          organization_id: 'org-1',
        } as Attendance,
        {
          id: 'att-2',
          employee_id: 'emp-1',
          date: new Date('2024-01-16'),
          status: AttendanceStatus.PRESENT,
          late_hours: null,
          week_start_date: new Date(weekStr),
          organization_id: 'org-1',
        } as Attendance,
      ];

      const mockAdvances: EmployeeAdvance[] = [
        {
          id: 'adv-1',
          employee_id: 'emp-1',
          amount: 3000,
          date: new Date('2024-01-17'),
          week_start_date: new Date(weekStr),
          organization_id: 'org-1',
        } as EmployeeAdvance,
      ];

      const mockEmployeesQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockEmployee as Employee]),
      };

      const mockAttendanceQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAttendance),
      };

      const mockAdvancesQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAdvances),
      };

      const mockPaymentsQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn()
          .mockResolvedValueOnce([]) // existing payments
          .mockResolvedValueOnce([]), // final query
      };

      mockEmployeesRepository.createQueryBuilder.mockReturnValue(mockEmployeesQb as any);
      mockAttendanceRepository.createQueryBuilder.mockReturnValue(mockAttendanceQb as any);
      mockAdvancesRepository.createQueryBuilder.mockReturnValue(mockAdvancesQb as any);
      mockPaymentsRepository.createQueryBuilder.mockReturnValue(mockPaymentsQb as any);

      // total_salary = 2 días × 10000 = 20000
      // late_deduction = (4/8) * 10000 = 5000
      // total_advances = 3000
      // net_payment = 20000 - 5000 - 3000 = 12000
      mockPaymentsRepository.create.mockReturnValue({
        employee_id: 'emp-1',
        week_start_date: new Date(weekStr),
        days_worked: 2,
        total_salary: 20000,
        late_hours: 4,
        late_deduction: 5000,
        total_advances: 3000,
        net_payment: 12000,
      });

      mockPaymentsRepository.save.mockResolvedValue({
        id: 'pay-1',
        employee_id: 'emp-1',
        net_payment: 12000,
      });

      await service.calculateWeek(weekStartDate, mockUser, { createExpenses: false });

      expect(mockPaymentsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: 'emp-1',
          total_salary: 20000,
          late_deduction: 5000,
          total_advances: 3000,
          net_payment: 12000,
        }),
      );
    });

    it('debe retornar pago neto mínimo 0 (no negativo)', async () => {
      const mockEmployee: Partial<Employee> = {
        id: 'emp-1',
        fullName: 'Empleado Test',
        daily_salary: 10000,
        isActive: true,
        organization_id: 'org-1',
      };

      const mockAttendance: Attendance[] = [
        {
          id: 'att-1',
          employee_id: 'emp-1',
          date: new Date('2024-01-15'),
          status: AttendanceStatus.PRESENT,
          late_hours: null,
          week_start_date: new Date(weekStr),
          organization_id: 'org-1',
        } as Attendance,
      ];

      const mockAdvances: EmployeeAdvance[] = [
        {
          id: 'adv-1',
          employee_id: 'emp-1',
          amount: 15000, // Adelanto mayor que el salario
          date: new Date('2024-01-16'),
          week_start_date: new Date(weekStr),
          organization_id: 'org-1',
        } as EmployeeAdvance,
      ];

      const mockEmployeesQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockEmployee as Employee]),
      };

      const mockAttendanceQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAttendance),
      };

      const mockAdvancesQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAdvances),
      };

      const mockPaymentsQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn()
          .mockResolvedValueOnce([]) // existing payments
          .mockResolvedValueOnce([]), // final query
      };

      mockEmployeesRepository.createQueryBuilder.mockReturnValue(mockEmployeesQb as any);
      mockAttendanceRepository.createQueryBuilder.mockReturnValue(mockAttendanceQb as any);
      mockAdvancesRepository.createQueryBuilder.mockReturnValue(mockAdvancesQb as any);
      mockPaymentsRepository.createQueryBuilder.mockReturnValue(mockPaymentsQb as any);

      // net_payment = 10000 - 15000 = -5000, pero debe ser 0
      mockPaymentsRepository.create.mockReturnValue({
        employee_id: 'emp-1',
        week_start_date: new Date(weekStr),
        days_worked: 1,
        total_salary: 10000,
        late_hours: null,
        late_deduction: 0,
        total_advances: 15000,
        net_payment: 0, // Math.max(0, -5000) = 0
      });

      mockPaymentsRepository.save.mockResolvedValue({
        id: 'pay-1',
        employee_id: 'emp-1',
        net_payment: 0,
      });

      await service.calculateWeek(weekStartDate, mockUser, { createExpenses: false });

      expect(mockPaymentsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: 'emp-1',
          net_payment: 0, // No puede ser negativo
        }),
      );
    });

    it('debe retornar array vacío si no hay empleados activos', async () => {
      const mockEmployeesQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]), // Sin empleados
      };

      mockEmployeesRepository.createQueryBuilder.mockReturnValue(mockEmployeesQb as any);

      const result = await service.calculateWeek(weekStartDate, mockUser, { createExpenses: false });

      expect(result).toEqual([]);
      expect(mockPaymentsRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('Validaciones de reglas de negocio', () => {
    const mockUser = createMockUser({ role: { name: UserRole.DIRECTION } });
    const weekStartDate = '2024-01-15';

    it('debe manejar empleado con salario diario 0', async () => {
      const mockEmployee: Partial<Employee> = {
        id: 'emp-1',
        fullName: 'Empleado Test',
        daily_salary: 0, // Salario 0
        isActive: true,
        organization_id: 'org-1',
      };

      const mockAttendance: Attendance[] = [
        {
          id: 'att-1',
          employee_id: 'emp-1',
          date: new Date('2024-01-15'),
          status: AttendanceStatus.PRESENT,
          late_hours: null,
          week_start_date: new Date('2024-01-15'),
          organization_id: 'org-1',
        } as Attendance,
      ];

      const mockEmployeesQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockEmployee as Employee]),
      };

      const mockAttendanceQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAttendance),
      };

      const mockAdvancesQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      const mockPaymentsQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn()
          .mockResolvedValueOnce([]) // existing payments
          .mockResolvedValueOnce([]), // final query
      };

      mockEmployeesRepository.createQueryBuilder.mockReturnValue(mockEmployeesQb as any);
      mockAttendanceRepository.createQueryBuilder.mockReturnValue(mockAttendanceQb as any);
      mockAdvancesRepository.createQueryBuilder.mockReturnValue(mockAdvancesQb as any);
      mockPaymentsRepository.createQueryBuilder.mockReturnValue(mockPaymentsQb as any);

      // Con salario 0, total_salary = 0, late_deduction = 0
      mockPaymentsRepository.create.mockReturnValue({
        employee_id: 'emp-1',
        week_start_date: new Date('2024-01-15'),
        days_worked: 1,
        total_salary: 0,
        late_hours: null,
        late_deduction: 0,
        total_advances: 0,
        net_payment: 0,
      });

      mockPaymentsRepository.save.mockResolvedValue({
        id: 'pay-1',
        employee_id: 'emp-1',
        total_salary: 0,
        net_payment: 0,
      });

      await service.calculateWeek(weekStartDate, mockUser, { createExpenses: false });

      expect(mockPaymentsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: 'emp-1',
          total_salary: 0,
          late_deduction: 0, // (late_hours / 8) * 0 = 0
          net_payment: 0,
        }),
      );
    });
  });
});
