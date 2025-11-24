import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestApp, TestDataBuilder } from './test-helpers';
import { UserRole, Currency, ExpenseState, DocumentType, CashboxStatus } from '../../src/common/enums';

describe('Cashbox → Expense → Validation → Accounting Flow (e2e)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let dataBuilder: TestDataBuilder;
  let operatorToken: string;
  let adminToken: string;
  let operatorUser: any;
  let adminUser: any;
  let work: any;
  let rubric: any;
  let cashbox: any;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup();
    app = testApp.getApp();
    dataBuilder = new TestDataBuilder(testApp.getDataSource());

    // Create roles
    await dataBuilder.createRole(UserRole.OPERATOR);
    await dataBuilder.createRole(UserRole.ADMINISTRATION);

    // Create users
    operatorUser = await dataBuilder.createUser(
      'operator@test.com',
      'password123',
      UserRole.OPERATOR,
    );
    adminUser = await dataBuilder.createUser(
      'admin@test.com',
      'password123',
      UserRole.ADMINISTRATION,
    );

    // Login users
    const operatorLogin = await dataBuilder.loginUser(
      app,
      'operator@test.com',
      'password123',
    );
    operatorToken = operatorLogin.token;

    const adminLogin = await dataBuilder.loginUser(
      app,
      'admin@test.com',
      'password123',
    );
    adminToken = adminLogin.token;

    // Create test data
    rubric = await dataBuilder.createRubric('Materials', 'MAT');
    work = await dataBuilder.createWork('Test Work', Currency.ARS);
    cashbox = await dataBuilder.createCashbox(operatorUser.id, CashboxStatus.OPEN, 10000, 0);
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe('Complete Flow: Cashbox → Expense → Validation → Accounting', () => {
    it('should complete full flow: create cashbox → create expense → validate → check accounting', async () => {
      // Step 1: Create expense as operator
      const expenseData = {
        work_id: work.id,
        rubric_id: rubric.id,
        amount: 5000,
        currency: Currency.ARS,
        purchase_date: '2024-01-15',
        document_type: DocumentType.INVOICE_A,
        document_number: '0001-00001234',
      };

      const createExpenseResponse = await request(app.getHttpServer())
        .post('/api/expenses')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(expenseData)
        .expect(201);

      const expense = createExpenseResponse.body;
      expect(expense.id).toBeDefined();
      expect(expense.state).toBe(ExpenseState.PENDING);
      expect(expense.work_id).toBe(work.id);

      // Step 2: Validate expense as admin
      const validateResponse = await request(app.getHttpServer())
        .post(`/api/expenses/${expense.id}/validate`)
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .send({
          state: ExpenseState.VALIDATED,
          observations: 'All documents verified',
        })
        .expect(200);

      expect(validateResponse.body.state).toBe(ExpenseState.VALIDATED);
      expect(validateResponse.body.validated_by_id).toBe(adminUser.id);

      // Step 3: Check accounting record was created
      const accountingRecords = await request(app.getHttpServer())
        .get('/api/accounting')
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(200);

      const createdRecord = accountingRecords.body.find(
        (r: any) => r.expense_id === expense.id,
      );
      expect(createdRecord).toBeDefined();
      expect(createdRecord.accounting_type).toBe('fiscal');
      expect(createdRecord.amount).toBe(5000);
    });

    it('should create cash movement when expense is validated', async () => {
      const expenseData = {
        work_id: work.id,
        rubric_id: rubric.id,
        amount: 3000,
        currency: Currency.ARS,
        purchase_date: '2024-01-16',
        document_type: DocumentType.INVOICE_B,
        document_number: '0001-00001235',
      };

      const expenseResponse = await request(app.getHttpServer())
        .post('/api/expenses')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(expenseData)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/expenses/${expenseResponse.body.id}/validate`)
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .send({ state: ExpenseState.VALIDATED })
        .expect(200);

      // Check cash movements
      const movements = await request(app.getHttpServer())
        .get('/api/cash-movements')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .expect(200);

      const expenseMovement = movements.body.find(
        (m: any) => m.expense_id === expenseResponse.body.id,
      );
      expect(expenseMovement).toBeDefined();
    });
  });

  describe('Error Cases', () => {
    it('should fail to create expense without work', async () => {
      const expenseData = {
        rubric_id: rubric.id,
        amount: 5000,
        currency: Currency.ARS,
        purchase_date: '2024-01-15',
        document_type: DocumentType.INVOICE_A,
      };

      await request(app.getHttpServer())
        .post('/api/expenses')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(expenseData)
        .expect(400);
    });

    it('should fail to validate expense as operator', async () => {
      const expenseData = {
        work_id: work.id,
        rubric_id: rubric.id,
        amount: 2000,
        currency: Currency.ARS,
        purchase_date: '2024-01-17',
        document_type: DocumentType.INVOICE_C,
      };

      const expenseResponse = await request(app.getHttpServer())
        .post('/api/expenses')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(expenseData)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/expenses/${expenseResponse.body.id}/validate`)
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send({ state: ExpenseState.VALIDATED })
        .expect(403);
    });
  });
});


