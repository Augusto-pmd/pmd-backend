import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { TestApp, TestDataBuilder } from './test-helpers';
import { UserRole } from '../../src/common/enums/user-role.enum';
import { Currency } from '../../src/common/enums/currency.enum';
import { AttendanceStatus } from '../../src/common/enums/attendance-status.enum';

function iso(date: Date): string {
  return date.toISOString().split('T')[0];
}

function weekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return iso(monday);
}

describe('Payroll (Fase 4) (e2e)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let dataBuilder: TestDataBuilder;
  let directionToken: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup();
    app = testApp.getApp();
    dataBuilder = new TestDataBuilder(testApp.getDataSource());

    await dataBuilder.createRole(UserRole.DIRECTION);
    await dataBuilder.createUser('direction@payroll.test', 'password123', UserRole.DIRECTION);
    directionToken = (await dataBuilder.loginUser(app, 'direction@payroll.test', 'password123')).token;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  it('debe calcular pagos, descontar tardanzas/adelantos y crear gasto automáticamente', async () => {
    const work = await dataBuilder.createWork('Obra Nómina', Currency.ARS);

    const employee = await request(app.getHttpServer())
      .post('/api/employees')
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .send({
        fullName: 'Empleado Nómina',
        daily_salary: 10000,
        work_id: work.id,
        isActive: true,
      })
      .expect(201);

    const monday = new Date('2024-01-15T00:00:00.000Z');
    const week = iso(monday); // 2024-01-15

    // 4 presentes + 1 tarde (2hs) => days_worked = 5, late_hours = 2
    const attendances = [
      { employee_id: employee.body.id, date: week, status: AttendanceStatus.PRESENT },
      { employee_id: employee.body.id, date: iso(new Date('2024-01-16T00:00:00.000Z')), status: AttendanceStatus.PRESENT },
      { employee_id: employee.body.id, date: iso(new Date('2024-01-17T00:00:00.000Z')), status: AttendanceStatus.PRESENT },
      { employee_id: employee.body.id, date: iso(new Date('2024-01-18T00:00:00.000Z')), status: AttendanceStatus.PRESENT },
      { employee_id: employee.body.id, date: iso(new Date('2024-01-19T00:00:00.000Z')), status: AttendanceStatus.LATE, late_hours: 2 },
    ];

    await request(app.getHttpServer())
      .post('/api/attendance/bulk')
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .send({ week_start_date: week, attendances })
      .expect(201);

    // Adelanto de 5000 en la semana
    await request(app.getHttpServer())
      .post('/api/employee-advances')
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .send({
        employee_id: employee.body.id,
        amount: 5000,
        date: '2024-01-17',
        description: 'Adelanto test',
      })
      .expect(201);

    const result = await request(app.getHttpServer())
      .post(`/api/payroll/calculate/${week}`)
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .expect(201);

    expect(Array.isArray(result.body)).toBe(true);
    const payment = result.body.find((p: any) => p.employee_id === employee.body.id);
    expect(payment).toBeTruthy();
    expect(payment.week_start_date).toBe(week);
    expect(payment.days_worked).toBe(5);

    // total_salary = 5 * 10000 = 50000
    expect(Number(payment.total_salary)).toBe(50000);
    // late_deduction = (2/8) * 10000 = 2500
    expect(Number(payment.late_deduction)).toBe(2500);
    expect(Number(payment.total_advances)).toBe(5000);
    // net_payment = 50000 - 2500 - 5000 = 42500
    expect(Number(payment.net_payment)).toBe(42500);

    expect(payment.expense_id).toBeTruthy();

    const expense = await request(app.getHttpServer())
      .get(`/api/expenses/${payment.expense_id}`)
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .expect(200);

    expect(Number(expense.body.amount)).toBe(42500);
    expect(String(expense.body.observations || '')).toContain('Nómina semanal');

    // Recibo imprimible (Fase 6)
    const receipt = await request(app.getHttpServer())
      .get(`/api/payroll/receipts/employee/${employee.body.id}/week/${week}`)
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .expect(200);

    expect(receipt.body.type).toBe('employee');
    expect(receipt.body.week_start_date).toBe(week);
    expect(receipt.body.employee?.id).toBe(employee.body.id);
    expect(Number(receipt.body.totals?.total_salary)).toBe(50000);
    expect(Number(receipt.body.totals?.late_deduction)).toBe(2500);
    expect(Number(receipt.body.totals?.total_advances)).toBe(5000);
    expect(Number(receipt.body.totals?.net_payment)).toBe(42500);
    expect(Array.isArray(receipt.body.advances)).toBe(true);
    expect(receipt.body.advances.length).toBe(1);
    expect(Number(receipt.body.advances[0].amount)).toBe(5000);
  });

  it('debe permitir crear gasto manualmente desde un pago sin gasto', async () => {
    const work = await dataBuilder.createWork('Obra Nómina 2', Currency.ARS);

    const employee = await request(app.getHttpServer())
      .post('/api/employees')
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .send({
        fullName: 'Empleado Nómina 2',
        daily_salary: 8000,
        work_id: work.id,
        isActive: true,
      })
      .expect(201);

    const date = '2024-01-22';
    const week = weekStart(date);

    await request(app.getHttpServer())
      .post('/api/attendance')
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .send({
        employee_id: employee.body.id,
        date,
        status: AttendanceStatus.PRESENT,
      })
      .expect(201);

    // Calcular sin crear gastos automáticamente
    const calculated = await request(app.getHttpServer())
      .post(`/api/payroll/calculate/${week}?createExpenses=false`)
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .expect(201);

    const payment = calculated.body.find((p: any) => p.employee_id === employee.body.id);
    expect(payment).toBeTruthy();
    expect(payment.expense_id).toBeFalsy();

    const expense = await request(app.getHttpServer())
      .post(`/api/expenses/from-payment/${payment.id}`)
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .expect(201);

    expect(expense.body.id).toBeTruthy();

    const weekPayments = await request(app.getHttpServer())
      .get(`/api/payroll/week/${week}`)
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .expect(200);

    const updated = weekPayments.body.find((p: any) => p.employee_id === employee.body.id);
    expect(updated).toBeTruthy();
    expect(updated.expense_id).toBe(expense.body.id);
  });
});

