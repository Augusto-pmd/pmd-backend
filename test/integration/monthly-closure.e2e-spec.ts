import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestApp, TestDataBuilder } from './test-helpers';
import {
  UserRole,
  Currency,
  MonthStatus,
  AccountingType,
  ExpenseState,
  DocumentType,
} from '../../src/common/enums';

describe('Monthly Closure and Direction Override (e2e)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let dataBuilder: TestDataBuilder;
  let adminToken: string;
  let directionToken: string;
  let operatorToken: string;
  let work: any;
  let rubric: any;
  let supplier: any;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup();
    app = testApp.getApp();
    dataBuilder = new TestDataBuilder(testApp.getDataSource());

    // Create roles and users
    await dataBuilder.createRole(UserRole.ADMINISTRATION);
    await dataBuilder.createRole(UserRole.DIRECTION);
    await dataBuilder.createRole(UserRole.OPERATOR);

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
    const operatorUser = await dataBuilder.createUser(
      'operator@test.com',
      'password123',
      UserRole.OPERATOR,
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

    const operatorLogin = await dataBuilder.loginUser(
      app,
      'operator@test.com',
      'password123',
    );
    operatorToken = operatorLogin.token;

    // Create test data
    rubric = await dataBuilder.createRubric('Materials', 'MAT');
    work = await dataBuilder.createWork('Closure Test Work', Currency.ARS);
    supplier = await dataBuilder.createSupplier(
      'Test Supplier',
      'approved',
      adminUser.id,
    );
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe('Month Closing', () => {
    it('should close month and prevent new records (non-direction)', async () => {
      // Create some accounting records for January 2024
      const expenseData = {
        work_id: work.id,
        supplier_id: supplier.id,
        rubric_id: rubric.id,
        amount: 10000,
        currency: Currency.ARS,
        purchase_date: '2024-01-15',
        document_type: DocumentType.INVOICE_A,
        document_number: '0001-00001234',
      };

      const expenseResponse = await request(app.getHttpServer())
        .post('/api/expenses')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(expenseData)
        .expect(201);

      // Validate expense to create accounting record
      await request(app.getHttpServer())
        .post(`/api/expenses/${expenseResponse.body.id}/validate`)
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .send({ state: ExpenseState.VALIDATED })
        .expect(200);

      // Close month
      await request(app.getHttpServer())
        .post('/api/accounting/close-month')
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .send({
          month: 1,
          year: 2024,
          status: MonthStatus.CLOSED,
        })
        .expect(200);

      // Try to create new accounting record in closed month (should fail for non-direction)
      const newExpenseData = {
        work_id: work.id,
        supplier_id: supplier.id,
        rubric_id: rubric.id,
        amount: 5000,
        currency: Currency.ARS,
        purchase_date: '2024-01-20',
        document_type: DocumentType.INVOICE_B,
        document_number: '0001-00001235',
      };

      const newExpenseResponse = await request(app.getHttpServer())
        .post('/api/expenses')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(newExpenseData)
        .expect(201);

      // Try to validate (this should create accounting record)
      // Should fail for non-direction
      await request(app.getHttpServer())
        .post(`/api/expenses/${newExpenseResponse.body.id}/validate`)
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .send({ state: ExpenseState.VALIDATED })
        .expect(403); // Should fail because month is closed
    });

    it('should allow Direction to create records in closed month', async () => {
      // Direction can override closed month
      const expenseData = {
        work_id: work.id,
        supplier_id: supplier.id,
        rubric_id: rubric.id,
        amount: 3000,
        currency: Currency.ARS,
        purchase_date: '2024-01-25',
        document_type: DocumentType.INVOICE_C,
        document_number: '0001-00001236',
      };

      const expenseResponse = await request(app.getHttpServer())
        .post('/api/expenses')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(expenseData)
        .expect(201);

      // Direction can validate even in closed month
      await request(app.getHttpServer())
        .post(`/api/expenses/${expenseResponse.body.id}/validate`)
        .set(await dataBuilder.getAuthHeaders(directionToken))
        .send({ state: ExpenseState.VALIDATED })
        .expect(200);
    });

    it('should allow Direction to reopen closed month', async () => {
      // Reopen January 2024
      await request(app.getHttpServer())
        .post('/api/accounting/reopen-month/1/2024')
        .set(await dataBuilder.getAuthHeaders(directionToken))
        .expect(200);

      // Verify month is open
      const records = await request(app.getHttpServer())
        .get('/api/accounting/month/1/2024')
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(200);

      // All records should have open status now
      if (records.body.length > 0) {
        expect(records.body[0].month_status).toBe(MonthStatus.OPEN);
      }
    });

    it('should prevent non-direction from reopening closed month', async () => {
      // Close month again
      await request(app.getHttpServer())
        .post('/api/accounting/close-month')
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .send({
          month: 2,
          year: 2024,
          status: MonthStatus.CLOSED,
        })
        .expect(200);

      // Admin cannot reopen
      await request(app.getHttpServer())
        .post('/api/accounting/reopen-month/2/2024')
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(403);
    });
  });

  describe('Month Closing Reports', () => {
    it('should generate purchases book report', async () => {
      const purchasesBook = await request(app.getHttpServer())
        .get('/api/accounting/purchases-book?month=1&year=2024')
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(200);

      expect(Array.isArray(purchasesBook.body)).toBe(true);
    });

    it('should generate perceptions report', async () => {
      const perceptions = await request(app.getHttpServer())
        .get('/api/accounting/perceptions?month=1&year=2024')
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(200);

      expect(perceptions.body).toHaveProperty('total_vat_perception');
      expect(perceptions.body).toHaveProperty('total_iibb_perception');
    });

    it('should generate withholdings report', async () => {
      const withholdings = await request(app.getHttpServer())
        .get('/api/accounting/withholdings?month=1&year=2024')
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(200);

      expect(withholdings.body).toHaveProperty('total_vat_withholding');
      expect(withholdings.body).toHaveProperty('total_income_tax_withholding');
    });
  });
});


