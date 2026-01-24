import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { TestApp, TestDataBuilder } from './test-helpers';
import { UserRole } from '../../src/common/enums/user-role.enum';

function mondayOf(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

describe('Employee Advances (Fase 3) (e2e)', () => {
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

    await dataBuilder.createUser('direction@advances.test', 'password123', UserRole.DIRECTION, {
      organization: orgA,
      organizationId: orgA.id,
    });
    await dataBuilder.createUser('admin@advances.test', 'password123', UserRole.ADMINISTRATION, {
      organization: orgB,
      organizationId: orgB.id,
    });

    directionToken = (await dataBuilder.loginUser(app, 'direction@advances.test', 'password123')).token;
    adminToken = (await dataBuilder.loginUser(app, 'admin@advances.test', 'password123')).token;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  it('debe crear adelantos, calcular week_start_date y filtrar opcionalmente por organización', async () => {
    const date = '2024-02-07'; // Miércoles
    const weekStart = mondayOf(date); // 2024-02-05

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

    const advA = await request(app.getHttpServer())
      .post('/api/employee-advances')
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .send({
        employee_id: empA.body.id,
        amount: 5000,
        date,
        description: 'Adelanto A',
      })
      .expect(201);

    expect(advA.body.week_start_date).toBe(weekStart);

    await request(app.getHttpServer())
      .post('/api/employee-advances')
      .set(await dataBuilder.getAuthHeaders(adminToken))
      .send({
        employee_id: empB.body.id,
        amount: 3000,
        date,
        description: 'Adelanto B',
      })
      .expect(201);

    // Por defecto: mostrar todo
    const all = await request(app.getHttpServer())
      .get(`/api/employee-advances/week/${weekStart}`)
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .expect(200);

    expect(Array.isArray(all.body)).toBe(true);
    expect(all.body.length).toBe(2);

    // Con filtro: Org A
    const orgAOnly = await request(app.getHttpServer())
      .get(`/api/employee-advances/week/${weekStart}?filterByOrganization=true`)
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .expect(200);

    expect(orgAOnly.body.length).toBe(1);
    expect(orgAOnly.body[0].employee_id).toBe(empA.body.id);

    // Listado principal con filtro también
    const listOrgA = await request(app.getHttpServer())
      .get(`/api/employee-advances?filterByOrganization=true`)
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .expect(200);

    expect(listOrgA.body.length).toBeGreaterThanOrEqual(1);
    listOrgA.body.forEach((a: any) => {
      expect(a.employee_id).toBe(empA.body.id);
    });
  });
});

