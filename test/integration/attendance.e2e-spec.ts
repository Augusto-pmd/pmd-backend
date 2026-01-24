import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { TestApp, TestDataBuilder } from './test-helpers';
import { UserRole } from '../../src/common/enums/user-role.enum';
import { AttendanceStatus } from '../../src/common/enums/attendance-status.enum';

function mondayOf(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

describe('Attendance (Fase 2) (e2e)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let dataBuilder: TestDataBuilder;
  let directionToken: string;
  let adminToken: string;
  let orgA: any;
  let orgB: any;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup();
    app = testApp.getApp();
    dataBuilder = new TestDataBuilder(testApp.getDataSource());

    await dataBuilder.createRole(UserRole.DIRECTION);
    await dataBuilder.createRole(UserRole.ADMINISTRATION);

    orgA = await dataBuilder.createOrganization('Org A');
    orgB = await dataBuilder.createOrganization('Org B');

    await dataBuilder.createUser('direction@attendance.test', 'password123', UserRole.DIRECTION, {
      organization: orgA,
      organizationId: orgA.id,
    });
    await dataBuilder.createUser('admin@attendance.test', 'password123', UserRole.ADMINISTRATION, {
      organization: orgB,
      organizationId: orgB.id,
    });

    directionToken = (await dataBuilder.loginUser(app, 'direction@attendance.test', 'password123')).token;
    adminToken = (await dataBuilder.loginUser(app, 'admin@attendance.test', 'password123')).token;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  it('debe calcular week_start_date y permitir filtro opcional por organización en la planilla semanal', async () => {
    const dateA = '2024-01-17'; // Miércoles
    const weekStart = mondayOf(dateA); // 2024-01-15

    const empA = await request(app.getHttpServer())
      .post('/api/employees')
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .send({ fullName: 'Empleado A', isActive: true })
      .expect(201);

    const empB = await request(app.getHttpServer())
      .post('/api/employees')
      .set(await dataBuilder.getAuthHeaders(adminToken))
      .send({ fullName: 'Empleado B', isActive: true })
      .expect(201);

    const a1 = await request(app.getHttpServer())
      .post('/api/attendance')
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .send({
        employee_id: empA.body.id,
        date: dateA,
        status: AttendanceStatus.LATE,
        late_hours: 1.5,
      })
      .expect(201);

    expect(a1.body.week_start_date).toBe(weekStart);

    await request(app.getHttpServer())
      .post('/api/attendance')
      .set(await dataBuilder.getAuthHeaders(adminToken))
      .send({
        employee_id: empB.body.id,
        date: dateA,
        status: AttendanceStatus.PRESENT,
      })
      .expect(201);

    // Por defecto: sin filtro, debería devolver ambos registros de la semana
    const weekAll = await request(app.getHttpServer())
      .get(`/api/attendance/week/${weekStart}`)
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .expect(200);

    expect(Array.isArray(weekAll.body)).toBe(true);
    expect(weekAll.body.length).toBe(2);

    // Con filtro por organización: solo los de Org A
    const weekOrgA = await request(app.getHttpServer())
      .get(`/api/attendance/week/${weekStart}?filterByOrganization=true`)
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .expect(200);

    expect(weekOrgA.body.length).toBe(1);
    expect(weekOrgA.body[0].employee_id).toBe(empA.body.id);

    // El endpoint list también soporta filtro por semana y organización
    const listOrgA = await request(app.getHttpServer())
      .get(`/api/attendance?week_start_date=${weekStart}&filterByOrganization=true`)
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .expect(200);

    expect(listOrgA.body.length).toBe(1);
    expect(listOrgA.body[0].employee_id).toBe(empA.body.id);
  });
});

