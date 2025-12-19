import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../../src/app.module';
import { TestApp, TestDataBuilder } from './test-helpers';
import { UserRole, Currency, IncomeType } from '../../src/common/enums';

describe('Income → Work Dashboard Flow (e2e)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let dataBuilder: TestDataBuilder;
  let adminToken: string;
  let directionToken: string;
  let work: any;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup();
    app = testApp.getApp();
    dataBuilder = new TestDataBuilder(testApp.getDataSource());

    // Create roles and users
    await dataBuilder.createRole(UserRole.ADMINISTRATION);
    await dataBuilder.createRole(UserRole.DIRECTION);

    const adminUser = await dataBuilder.createUser(
      'admin@test.com',
      'password123',
      UserRole.ADMINISTRATION,
    );
    const directionUser = await dataBuilder.createUser(
      'direction@test.com',
      'password123',
      UserRole.DIRECTION,
    );

    const adminLogin = await dataBuilder.loginUser(
      app,
      'admin@test.com',
      'password123',
    );
    adminToken = adminLogin.token;

    const directionLogin = await dataBuilder.loginUser(
      app,
      'direction@test.com',
      'password123',
    );
    directionToken = directionLogin.token;

    // Create work
    work = await dataBuilder.createWork('Dashboard Test Work', Currency.USD);
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe('Income Registration and Work Dashboard Updates', () => {
    it('should register income and update work totals', async () => {
      // Register income as admin
      const incomeData = {
        work_id: work.id,
        type: IncomeType.ADVANCE,
        amount: 50000,
        currency: Currency.USD,
        date: '2024-01-15',
        document_number: 'CERT-001',
      };

      const incomeResponse = await request(app.getHttpServer())
        .post('/api/incomes')
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .send(incomeData)
        .expect(201);

      expect(incomeResponse.body.id).toBeDefined();
      expect(incomeResponse.body.amount).toBe(50000);
      expect(incomeResponse.body.work_id).toBe(work.id);

      // Verify work totals updated
      const workResponse = await request(app.getHttpServer())
        .get(`/api/works/${work.id}`)
        .set(await dataBuilder.getAuthHeaders(directionToken))
        .expect(200);

      expect(parseFloat(workResponse.body.total_incomes)).toBeGreaterThanOrEqual(50000);
    });

    it('should register multiple incomes and calculate total', async () => {
      const incomes = [
        {
          work_id: work.id,
          type: IncomeType.CERTIFICATION,
          amount: 30000,
          currency: Currency.USD,
          date: '2024-02-01',
        },
        {
          work_id: work.id,
          type: IncomeType.FINAL_PAYMENT,
          amount: 20000,
          currency: Currency.USD,
          date: '2024-03-01',
        },
      ];

      for (const incomeData of incomes) {
        await request(app.getHttpServer())
          .post('/api/incomes')
          .set(await dataBuilder.getAuthHeaders(adminToken))
          .send(incomeData)
          .expect(201);
      }

      // Verify all incomes
      const allIncomes = await request(app.getHttpServer())
        .get('/api/incomes')
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(200);

      const workIncomes = allIncomes.body.filter(
        (i: any) => i.work_id === work.id,
      );
      expect(workIncomes.length).toBeGreaterThanOrEqual(2);
    });

    it('should fail when operator tries to register income', async () => {
      const operatorUser = await dataBuilder.createUser(
        'operator2@test.com',
        'password123',
        UserRole.OPERATOR,
      );
      const operatorLogin = await dataBuilder.loginUser(
        app,
        'operator2@test.com',
        'password123',
      );

      const incomeData = {
        work_id: work.id,
        type: IncomeType.ADVANCE,
        amount: 10000,
        currency: Currency.USD,
        date: '2024-01-20',
      };

      await request(app.getHttpServer())
        .post('/api/incomes')
        .set(await dataBuilder.getAuthHeaders(operatorLogin.token))
        .send(incomeData)
        .expect(403);
    });
  });

  describe('Work Financial Progress Calculation', () => {
    it('should calculate financial progress correctly', async () => {
      // Create work with budget
      const testWork = await dataBuilder.createWork('Progress Test', Currency.ARS, null, {
        total_budget: 100000,
      });

      // Add income
      await request(app.getHttpServer())
        .post('/api/incomes')
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .send({
          work_id: testWork.id,
          type: IncomeType.ADVANCE,
          amount: 40000,
          currency: Currency.ARS,
          date: '2024-01-15',
        })
        .expect(201);

      // Verify work financial progress
      const workResponse = await request(app.getHttpServer())
        .get(`/api/works/${testWork.id}`)
        .set(await dataBuilder.getAuthHeaders(directionToken))
        .expect(200);

      expect(workResponse.body.total_incomes).toBeGreaterThan(0);
      expect(workResponse.body.total_budget).toBe(100000);
    });
  });
});


