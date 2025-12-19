import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../../src/app.module';
import { TestApp, TestDataBuilder } from './test-helpers';
import { UserRole, Currency, SupplierStatus, CashboxStatus } from '../../src/common/enums';

describe('Multi-Role Permission Tests (e2e)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let dataBuilder: TestDataBuilder;
  let directionToken: string;
  let supervisorToken: string;
  let adminToken: string;
  let operatorToken: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup();
    app = testApp.getApp();
    dataBuilder = new TestDataBuilder(testApp.getDataSource());

    // Create all roles
    await dataBuilder.createRole(UserRole.DIRECTION);
    await dataBuilder.createRole(UserRole.SUPERVISOR);
    await dataBuilder.createRole(UserRole.ADMINISTRATION);
    await dataBuilder.createRole(UserRole.OPERATOR);

    // Create users for each role
    const directionUser = await dataBuilder.createUser(
      'direction@test.com',
      'password123',
      UserRole.DIRECTION,
    );
    const supervisorUser = await dataBuilder.createUser(
      'supervisor@test.com',
      'password123',
      UserRole.SUPERVISOR,
    );
    const adminUser = await dataBuilder.createUser(
      'admin@test.com',
      'password123',
      UserRole.ADMINISTRATION,
    );
    const operatorUser = await dataBuilder.createUser(
      'operator@test.com',
      'password123',
      UserRole.OPERATOR,
    );

    // Login all users
    const directionLogin = await dataBuilder.loginUser(
      app,
      'direction@test.com',
      'password123',
    );
    directionToken = directionLogin.token;

    const supervisorLogin = await dataBuilder.loginUser(
      app,
      'supervisor@test.com',
      'password123',
    );
    supervisorToken = supervisorLogin.token;

    const adminLogin = await dataBuilder.loginUser(
      app,
      'admin@test.com',
      'password123',
    );
    adminToken = adminLogin.token;

    const operatorLogin = await dataBuilder.loginUser(
      app,
      'operator@test.com',
      'password123',
    );
    operatorToken = operatorLogin.token;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe('Direction Permissions', () => {
    it('should have full access to all endpoints', async () => {
      // Can manage users
      await request(app.getHttpServer())
        .get('/api/users')
        .set(await dataBuilder.getAuthHeaders(directionToken))
        .expect(200);

      // Can manage roles
      await request(app.getHttpServer())
        .get('/api/roles')
        .set(await dataBuilder.getAuthHeaders(directionToken))
        .expect(200);

      // Can view all cashboxes
      await request(app.getHttpServer())
        .get('/api/cashboxes')
        .set(await dataBuilder.getAuthHeaders(directionToken))
        .expect(200);

      // Can override blocks
      // Can reopen closed months
      // Can delete any record
    });

    it('should be able to override blocked contracts', async () => {
      const work = await dataBuilder.createWork('Override Test', Currency.ARS);
      const supplier = await dataBuilder.createSupplier(
        'Test Supplier',
        SupplierStatus.APPROVED,
      );
      const rubric = await dataBuilder.createRubric('Test', 'TST');

      const contract = await dataBuilder.createContract(
        work.id,
        supplier.id,
        rubric.id,
        10000,
        Currency.ARS,
      );

      // Block contract
      await request(app.getHttpServer())
        .patch(`/api/contracts/${contract.id}`)
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .send({ amount_executed: 10000 })
        .expect(200);

      // Direction can unblock
      await request(app.getHttpServer())
        .patch(`/api/contracts/${contract.id}`)
        .set(await dataBuilder.getAuthHeaders(directionToken))
        .send({ is_blocked: false })
        .expect(200);
    });
  });

  describe('Supervisor Permissions', () => {
    it('should view all works', async () => {
      await request(app.getHttpServer())
        .get('/api/works')
        .set(await dataBuilder.getAuthHeaders(supervisorToken))
        .expect(200);
    });

    it('should view all cashboxes', async () => {
      await request(app.getHttpServer())
        .get('/api/cashboxes')
        .set(await dataBuilder.getAuthHeaders(supervisorToken))
        .expect(200);
    });

    it('should mark schedule stages as completed', async () => {
      const work = await dataBuilder.createWork(
        'Supervisor Test',
        Currency.ARS,
      );

      const scheduleData = {
        work_id: work.id,
        stage_name: 'Test Stage',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        state: 'in_progress',
      };

      const scheduleResponse = await request(app.getHttpServer())
        .post('/api/schedule')
        .set(await dataBuilder.getAuthHeaders(directionToken))
        .send(scheduleData)
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/schedule/${scheduleResponse.body.id}`)
        .set(await dataBuilder.getAuthHeaders(supervisorToken))
        .send({ state: 'completed' })
        .expect(200);
    });

    it('should NOT modify accounting', async () => {
      await request(app.getHttpServer())
        .post('/api/accounting')
        .set(await dataBuilder.getAuthHeaders(supervisorToken))
        .send({})
        .expect(403);
    });

    it('should NOT change tax settings', async () => {
      // Supervisor cannot modify accounting records
      await request(app.getHttpServer())
        .patch('/api/accounting/any-id')
        .set(await dataBuilder.getAuthHeaders(supervisorToken))
        .send({})
        .expect(403);
    });

    it('should NOT modify roles', async () => {
      await request(app.getHttpServer())
        .post('/api/roles')
        .set(await dataBuilder.getAuthHeaders(supervisorToken))
        .send({})
        .expect(403);
    });
  });

  describe('Administration Permissions', () => {
    it('should validate expenses', async () => {
      const work = await dataBuilder.createWork('Admin Test', Currency.ARS);
      const rubric = await dataBuilder.createRubric('Test', 'TST');

      const expenseData = {
        work_id: work.id,
        rubric_id: rubric.id,
        amount: 5000,
        currency: Currency.ARS,
        purchase_date: '2024-01-15',
        document_type: 'invoice_a',
      };

      const expenseResponse = await request(app.getHttpServer())
        .post('/api/expenses')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(expenseData)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/expenses/${expenseResponse.body.id}/validate`)
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .send({ state: 'validated' })
        .expect(200);
    });

    it('should approve suppliers', async () => {
      const supplier = await dataBuilder.createSupplier(
        'Provisional Supplier',
        SupplierStatus.PROVISIONAL,
      );

      await request(app.getHttpServer())
        .post(`/api/suppliers/${supplier.id}/approve`)
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(200);
    });

    it('should manage contracts', async () => {
      const work = await dataBuilder.createWork('Contract Test', Currency.ARS);
      const supplier = await dataBuilder.createSupplier(
        'Contract Supplier',
        SupplierStatus.APPROVED,
      );
      const rubric = await dataBuilder.createRubric('Test', 'TST');

      const contractData = {
        work_id: work.id,
        supplier_id: supplier.id,
        rubric_id: rubric.id,
        amount_total: 20000,
        currency: Currency.ARS,
      };

      await request(app.getHttpServer())
        .post('/api/contracts')
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .send(contractData)
        .expect(201);
    });

    it('should generate reports', async () => {
      await request(app.getHttpServer())
        .get('/api/accounting/purchases-book?month=1&year=2024')
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(200);
    });

    it('should close months', async () => {
      await request(app.getHttpServer())
        .post('/api/accounting/close-month')
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .send({
          month: 3,
          year: 2024,
          status: 'closed',
        })
        .expect(200);
    });

    it('should NOT reopen closed months', async () => {
      await request(app.getHttpServer())
        .post('/api/accounting/reopen-month/3/2024')
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(403);
    });
  });

  describe('Operator Permissions', () => {
    it('should have own cashbox', async () => {
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

      const cashboxData = {
        user_id: operatorUser.id,
        opening_balance_ars: 5000,
        opening_date: '2024-01-15',
      };

      await request(app.getHttpServer())
        .post('/api/cashboxes')
        .set(await dataBuilder.getAuthHeaders(operatorLogin.token))
        .send(cashboxData)
        .expect(201);
    });

    it('should record expenses', async () => {
      const work = await dataBuilder.createWork('Operator Test', Currency.ARS);
      const rubric = await dataBuilder.createRubric('Test', 'TST');

      const expenseData = {
        work_id: work.id,
        rubric_id: rubric.id,
        amount: 2000,
        currency: Currency.ARS,
        purchase_date: '2024-01-15',
        document_type: 'invoice_a',
      };

      await request(app.getHttpServer())
        .post('/api/expenses')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(expenseData)
        .expect(201);
    });

    it('should create provisional suppliers', async () => {
      const supplierData = {
        name: 'Provisional by Operator',
        email: 'provisional@example.com',
      };

      const response = await request(app.getHttpServer())
        .post('/api/suppliers')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(supplierData)
        .expect(201);

      expect(response.body.status).toBe(SupplierStatus.PROVISIONAL);
    });

    it('should NOT view others cashboxes', async () => {
      // Get current operator user ID from token
      const operatorInfo = await dataBuilder.loginUser(
        app,
        'operator@test.com',
        'password123',
      );
      
      // Create another operator's cashbox
      const otherOperator = await dataBuilder.createUser(
        'other@test.com',
        'password123',
        UserRole.OPERATOR,
      );
      await dataBuilder.createCashbox(otherOperator.id, CashboxStatus.OPEN, 10000, 0);

      // Current operator should only see their own
      const cashboxes = await request(app.getHttpServer())
        .get('/api/cashboxes')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .expect(200);

      // Should only see own cashboxes (if any)
      if (cashboxes.body.length > 0) {
        cashboxes.body.forEach((cb: any) => {
          expect(cb.user_id).toBe(operatorInfo.user.id);
        });
      }
    });

    it('should NOT manage contracts', async () => {
      await request(app.getHttpServer())
        .post('/api/contracts')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send({})
        .expect(403);
    });

    it('should NOT manage accounting', async () => {
      await request(app.getHttpServer())
        .get('/api/accounting')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .expect(403);
    });
  });

  describe('Cross-Role Access Tests', () => {
    it('should prevent operator from validating own expense', async () => {
      const work = await dataBuilder.createWork('Cross Test', Currency.ARS);
      const rubric = await dataBuilder.createRubric('Test', 'TST');

      const expenseData = {
        work_id: work.id,
        rubric_id: rubric.id,
        amount: 1000,
        currency: Currency.ARS,
        purchase_date: '2024-01-15',
        document_type: 'invoice_a',
      };

      const expenseResponse = await request(app.getHttpServer())
        .post('/api/expenses')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(expenseData)
        .expect(201);

      // Operator cannot validate
      await request(app.getHttpServer())
        .post(`/api/expenses/${expenseResponse.body.id}/validate`)
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send({ state: 'validated' })
        .expect(403);
    });

    it('should prevent supervisor from editing schedule structure', async () => {
      const work = await dataBuilder.createWork('Schedule Test', Currency.ARS);

      const scheduleData = {
        work_id: work.id,
        stage_name: 'Test Stage',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      };

      const scheduleResponse = await request(app.getHttpServer())
        .post('/api/schedule')
        .set(await dataBuilder.getAuthHeaders(directionToken))
        .send(scheduleData)
        .expect(201);

      // Supervisor cannot change structure
      await request(app.getHttpServer())
        .patch(`/api/schedule/${scheduleResponse.body.id}`)
        .set(await dataBuilder.getAuthHeaders(supervisorToken))
        .send({
          stage_name: 'Modified Name',
          start_date: '2024-01-05',
        })
        .expect(403);
    });
  });
});

