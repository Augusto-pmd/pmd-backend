import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { TestApp, TestDataBuilder } from '../../integration/test-helpers';
import { UserRole } from '../../../src/common/enums/user-role.enum';
import { Currency } from '../../../src/common/enums/currency.enum';
import { ExpenseState } from '../../../src/common/enums/expense-state.enum';

/**
 * Integration tests for GET /api/works/:id/stats endpoint
 * 
 * Adapted from PMD-asistencias Contractor stats logic.
 * Tests the complete flow including authentication, authorization, and data retrieval.
 */
describe('Work Stats Endpoint (PMD Asistencias) - E2E', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let dataBuilder: TestDataBuilder;
  
  let adminToken: string;
  let supervisorToken: string;
  let directionToken: string;
  let operatorToken: string;
  
  let adminUser: any;
  let supervisorUser: any;
  let directionUser: any;
  let work: any;
  let workBudget: any;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup();
    app = testApp.getApp();
    dataBuilder = new TestDataBuilder(testApp.getDataSource());

    // Create roles
    await dataBuilder.createRole(UserRole.ADMINISTRATION);
    await dataBuilder.createRole(UserRole.SUPERVISOR);
    await dataBuilder.createRole(UserRole.DIRECTION);
    await dataBuilder.createRole(UserRole.OPERATOR);

    // Create users
    adminUser = await dataBuilder.createUser(
      'admin@test.com',
      'password123',
      UserRole.ADMINISTRATION,
    );

    supervisorUser = await dataBuilder.createUser(
      'supervisor@test.com',
      'password123',
      UserRole.SUPERVISOR,
    );

    directionUser = await dataBuilder.createUser(
      'direction@test.com',
      'password123',
      UserRole.DIRECTION,
    );

    const operatorUser = await dataBuilder.createUser(
      'operator@test.com',
      'password123',
      UserRole.OPERATOR,
    );

    // Login users
    const adminLogin = await dataBuilder.loginUser(
      app,
      'admin@test.com',
      'password123',
    );
    adminToken = adminLogin.token;

    const supervisorLogin = await dataBuilder.loginUser(
      app,
      'supervisor@test.com',
      'password123',
    );
    supervisorToken = supervisorLogin.token;

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

    // Create work with supervisor assigned
    work = await dataBuilder.createWork(
      'Stats Test Work',
      Currency.ARS,
      supervisorUser.id,
      {
        total_budget: 1000000,
        total_expenses: 350000,
        total_incomes: 450000,
        physical_progress: 45.5,
        economic_progress: 45.0,
        financial_progress: 56.25,
      },
    );

    // Create work budget
    const { WorkBudget } = await import('../../../src/work-budgets/work-budgets.entity');
    const workBudgetRepo = testApp.getDataSource().getRepository(WorkBudget);
    workBudget = workBudgetRepo.create({
      work_id: work.id,
      type: 'initial',
      amount: 1000000,
      description: 'Initial budget',
      date: new Date(),
    });
    await workBudgetRepo.save(workBudget);

    // Create some expenses (to simulate total_expenses)
    const { Expense } = await import('../../../src/expenses/expenses.entity');
    const { Rubric } = await import('../../../src/rubrics/rubrics.entity');
    const rubricRepo = testApp.getDataSource().getRepository(Rubric);
    const rubric = await rubricRepo.findOne({ where: { code: 'LAB' } }) || 
      await dataBuilder.createRubric('Labor', 'LAB');

    const expenseRepo = testApp.getDataSource().getRepository(Expense);
    const expense1 = expenseRepo.create({
      work_id: work.id,
      rubric_id: rubric.id,
      amount: 200000,
      currency: Currency.ARS,
      purchase_date: new Date(),
      document_type: 'invoice_a',
      document_number: '0001-00001234',
      state: ExpenseState.VALIDATED,
    });
    await expenseRepo.save(expense1);

    const expense2 = expenseRepo.create({
      work_id: work.id,
      rubric_id: rubric.id,
      amount: 150000,
      currency: Currency.ARS,
      purchase_date: new Date(),
      document_type: 'invoice_a',
      document_number: '0001-00001235',
      state: ExpenseState.VALIDATED,
    });
    await expenseRepo.save(expense2);
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe('GET /api/works/:id/stats', () => {
    it('should return 200 with correct stats for authenticated admin user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/works/${work.id}/stats`)
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.work_id).toBe(work.id);
      expect(response.body.work_name).toBe('Stats Test Work');
      expect(typeof response.body.total_budget).toBe('number');
      expect(typeof response.body.total_expenses).toBe('number');
      expect(typeof response.body.total_incomes).toBe('number');
      expect(typeof response.body.remaining_balance).toBe('number');
      expect(typeof response.body.profitability).toBe('number');
      expect(response.body.remaining_balance).toBeGreaterThanOrEqual(0); // Cannot be negative
      expect(response.body.physical_progress).toBe(45.5);
      expect(response.body.economic_progress).toBe(45.0);
      expect(response.body.financial_progress).toBe(56.25);
    });

    it('should return 200 with correct stats for authenticated supervisor user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/works/${work.id}/stats`)
        .set(await dataBuilder.getAuthHeaders(supervisorToken))
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.work_id).toBe(work.id);
      expect(response.body.work_name).toBe('Stats Test Work');
      expect(response.body).toHaveProperty('remaining_balance');
      expect(response.body).toHaveProperty('profitability');
    });

    it('should return 200 with correct stats for authenticated direction user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/works/${work.id}/stats`)
        .set(await dataBuilder.getAuthHeaders(directionToken))
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.work_id).toBe(work.id);
      expect(response.body.remaining_balance).toBeGreaterThanOrEqual(0);
    });

    it('should return 401 when user is not authenticated (no token)', async () => {
      await request(app.getHttpServer())
        .get(`/api/works/${work.id}/stats`)
        .expect(401);
    });

    it('should return 401 when token is invalid', async () => {
      await request(app.getHttpServer())
        .get(`/api/works/${work.id}/stats`)
        .set({
          Authorization: 'Bearer invalid-token',
        })
        .expect(401);
    });

    it('should return 403 when user role is not allowed (OPERATOR)', async () => {
      await request(app.getHttpServer())
        .get(`/api/works/${work.id}/stats`)
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .expect(403);
    });

    it('should return 404 when work does not exist', async () => {
      const nonExistentWorkId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/works/${nonExistentWorkId}/stats`)
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(404);
    });

    it('should return 403 when supervisor tries to access non-assigned work', async () => {
      // Create another work without assigning it to this supervisor
      const otherWork = await dataBuilder.createWork(
        'Other Work',
        Currency.ARS,
        null, // No supervisor assigned
        {
          total_budget: 500000,
        },
      );

      // Supervisor tries to access work they don't supervise
      await request(app.getHttpServer())
        .get(`/api/works/${otherWork.id}/stats`)
        .set(await dataBuilder.getAuthHeaders(supervisorToken))
        .expect(403);
    });

    it('should calculate remaining_balance correctly (budget - expenses)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/works/${work.id}/stats`)
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(200);

      const expectedRemainingBalance = Math.max(
        0,
        response.body.total_budget - response.body.total_expenses,
      );
      expect(response.body.remaining_balance).toBe(expectedRemainingBalance);
      expect(response.body.remaining_balance).toBeGreaterThanOrEqual(0);
    });

    it('should calculate profitability correctly (incomes - expenses)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/works/${work.id}/stats`)
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(200);

      const expectedProfitability = response.body.total_incomes - response.body.total_expenses;
      expect(response.body.profitability).toBe(expectedProfitability);
      // Profitability can be negative if expenses exceed incomes
    });

    it('should return remaining_balance as 0 when expenses exceed budget', async () => {
      // Create a work where expenses exceed budget
      const workWithExcessExpenses = await dataBuilder.createWork(
        'Excess Expenses Work',
        Currency.ARS,
        supervisorUser.id,
        {
          total_budget: 100000,
          total_expenses: 150000, // Exceeds budget
          total_incomes: 120000,
        },
      );

      const response = await request(app.getHttpServer())
        .get(`/api/works/${workWithExcessExpenses.id}/stats`)
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(200);

      expect(response.body.remaining_balance).toBe(0); // Should not be negative
      expect(response.body.total_expenses).toBe(150000);
      expect(response.body.total_budget).toBe(100000);
    });

    it('should return correct stats for work without expenses', async () => {
      const workWithoutExpenses = await dataBuilder.createWork(
        'No Expenses Work',
        Currency.ARS,
        supervisorUser.id,
        {
          total_budget: 500000,
          total_expenses: 0,
          total_incomes: 0,
        },
      );

      const response = await request(app.getHttpServer())
        .get(`/api/works/${workWithoutExpenses.id}/stats`)
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(200);

      expect(response.body.total_expenses).toBe(0);
      expect(response.body.total_incomes).toBe(0);
      expect(response.body.remaining_balance).toBe(500000); // Should equal total_budget
      expect(response.body.profitability).toBe(0);
    });

    it('should return correct stats for work without budget', async () => {
      const workWithoutBudget = await dataBuilder.createWork(
        'No Budget Work',
        Currency.ARS,
        supervisorUser.id,
        {
          total_budget: 0,
          total_expenses: 50000,
          total_incomes: 30000,
        },
      );

      const response = await request(app.getHttpServer())
        .get(`/api/works/${workWithoutBudget.id}/stats`)
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(200);

      expect(response.body.total_budget).toBe(0);
      expect(response.body.remaining_balance).toBe(0); // Should not be negative
      expect(response.body.total_expenses).toBe(50000);
      expect(response.body.profitability).toBe(-20000); // Negative profitability
    });

    it('should return all required fields in response', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/works/${work.id}/stats`)
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(200);

      expect(response.body).toHaveProperty('work_id');
      expect(response.body).toHaveProperty('work_name');
      expect(response.body).toHaveProperty('total_budget');
      expect(response.body).toHaveProperty('total_expenses');
      expect(response.body).toHaveProperty('total_incomes');
      expect(response.body).toHaveProperty('remaining_balance');
      expect(response.body).toHaveProperty('physical_progress');
      expect(response.body).toHaveProperty('economic_progress');
      expect(response.body).toHaveProperty('financial_progress');
      expect(response.body).toHaveProperty('profitability');
    });

    it('should return correct data types for all fields', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/works/${work.id}/stats`)
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(200);

      expect(typeof response.body.work_id).toBe('string');
      expect(typeof response.body.work_name).toBe('string');
      expect(typeof response.body.total_budget).toBe('number');
      expect(typeof response.body.total_expenses).toBe('number');
      expect(typeof response.body.total_incomes).toBe('number');
      expect(typeof response.body.remaining_balance).toBe('number');
      expect(typeof response.body.physical_progress).toBe('number');
      expect(typeof response.body.economic_progress).toBe('number');
      expect(typeof response.body.financial_progress).toBe('number');
      expect(typeof response.body.profitability).toBe('number');
    });
  });
});
