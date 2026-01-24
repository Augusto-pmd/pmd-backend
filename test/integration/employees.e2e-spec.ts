import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { TestApp, TestDataBuilder } from './test-helpers';
import { UserRole } from '../../src/common/enums/user-role.enum';
import { Currency } from '../../src/common/enums/currency.enum';
import { EmployeeTrade } from '../../src/common/enums/employee-trade.enum';

describe('Employees (Fase 1) (e2e)', () => {
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

    await dataBuilder.createUser('direction@employees.test', 'password123', UserRole.DIRECTION, {
      organization: orgA,
      organizationId: orgA.id,
    });
    await dataBuilder.createUser('admin@employees.test', 'password123', UserRole.ADMINISTRATION, {
      organization: orgB,
      organizationId: orgB.id,
    });

    directionToken = (await dataBuilder.loginUser(app, 'direction@employees.test', 'password123')).token;
    adminToken = (await dataBuilder.loginUser(app, 'admin@employees.test', 'password123')).token;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  it('debe crear empleados y filtrar por organización opcionalmente', async () => {
    const work = await dataBuilder.createWork('Obra Test', Currency.ARS);

    const e1 = await request(app.getHttpServer())
      .post('/api/employees')
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .send({
        fullName: 'Empleado Org A',
        daily_salary: 15000,
        trade: EmployeeTrade.ALBANILERIA,
        work_id: work.id,
        isActive: true,
      })
      .expect(201);

    const e2 = await request(app.getHttpServer())
      .post('/api/employees')
      .set(await dataBuilder.getAuthHeaders(adminToken))
      .send({
        fullName: 'Empleado Org B',
        daily_salary: 12000,
        trade: EmployeeTrade.PINTURA,
        isActive: true,
      })
      .expect(201);

    // Por defecto: mostrar todos (sin filtrar por organización)
    const allAsDirection = await request(app.getHttpServer())
      .get('/api/employees')
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .expect(200);

    expect(Array.isArray(allAsDirection.body)).toBe(true);
    expect(allAsDirection.body.length).toBeGreaterThanOrEqual(2);

    // Con filtro: solo organización del usuario
    const onlyOrgA = await request(app.getHttpServer())
      .get('/api/employees?filterByOrganization=true')
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .expect(200);

    expect(onlyOrgA.body.length).toBe(1);
    expect(onlyOrgA.body[0].id).toBe(e1.body.id);

    const onlyOrgB = await request(app.getHttpServer())
      .get('/api/employees?filterByOrganization=true')
      .set(await dataBuilder.getAuthHeaders(adminToken))
      .expect(200);

    expect(onlyOrgB.body.length).toBe(1);
    expect(onlyOrgB.body[0].id).toBe(e2.body.id);

    // Filtro por obra
    const byWork = await request(app.getHttpServer())
      .get(`/api/employees?work_id=${work.id}`)
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .expect(200);

    expect(byWork.body.length).toBe(1);
    expect(byWork.body[0].id).toBe(e1.body.id);
  });

  it('debe permitir ver detalle incluso si es de otra organización (por defecto sin filtro)', async () => {
    // Crear un empleado en Org B
    const created = await request(app.getHttpServer())
      .post('/api/employees')
      .set(await dataBuilder.getAuthHeaders(adminToken))
      .send({ fullName: 'Empleado Cross-Org', isActive: true })
      .expect(201);

    // Direction (Org A) puede ver el detalle si el comportamiento es "mostrar todo por defecto"
    await request(app.getHttpServer())
      .get(`/api/employees/${created.body.id}`)
      .set(await dataBuilder.getAuthHeaders(directionToken))
      .expect(200);
  });
});

