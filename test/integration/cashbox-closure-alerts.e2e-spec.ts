import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../../src/app.module';
import { TestApp, TestDataBuilder } from './test-helpers';
import {
  UserRole,
  Currency,
  CashboxStatus,
  AlertType,
  AlertSeverity,
} from '../../src/common/enums';

describe('Cashbox Closure → Alerts Generation Flow (e2e)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let dataBuilder: TestDataBuilder;
  let operatorToken: string;
  let adminToken: string;
  let directionToken: string;
  let operatorUser: any;
  let adminUser: any;
  let directionUser: any;
  let cashbox: any;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup();
    app = testApp.getApp();
    dataBuilder = new TestDataBuilder(testApp.getDataSource());

    // Create roles
    await dataBuilder.createRole(UserRole.OPERATOR);
    await dataBuilder.createRole(UserRole.ADMINISTRATION);
    await dataBuilder.createRole(UserRole.DIRECTION);

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
    directionUser = await dataBuilder.createUser(
      'direction@test.com',
      'password123',
      UserRole.DIRECTION,
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

    const directionLogin = await dataBuilder.loginUser(
      app,
      'direction@test.com',
      'password123',
    );
    directionToken = directionLogin.token;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe('Complete Flow: Cashbox Closure → Alerts Generation', () => {
    it('should close cashbox and generate alerts for differences', async () => {
      // Step 1: Create and open a cashbox as operator
      const openCashboxData = {
        opening_balance_ars: 10000,
        opening_balance_usd: 0,
      };

      const createCashboxResponse = await request(app.getHttpServer())
        .post('/api/cashboxes')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(openCashboxData)
        .expect(201);

      cashbox = createCashboxResponse.body;
      expect(cashbox.id).toBeDefined();
      expect(cashbox.status).toBe(CashboxStatus.OPEN);
      expect(cashbox.opening_balance_ars).toBe(10000);

      // Step 2: Close cashbox with a difference (expected: 10000, actual: 9500)
      const closeCashboxData = {
        closing_balance_ars: 9500,
        closing_balance_usd: 0,
      };

      const closeCashboxResponse = await request(app.getHttpServer())
        .post(`/api/cashboxes/${cashbox.id}/close`)
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(closeCashboxData)
        .expect(200);

      const closedCashbox = closeCashboxResponse.body;
      expect(closedCashbox.status).toBe(CashboxStatus.CLOSED);
      expect(closedCashbox.closing_balance_ars).toBe(9500);

      // Step 3: Verify that an alert was generated for the cashbox difference
      const alertsResponse = await request(app.getHttpServer())
        .get('/api/alerts')
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(200);

      const alerts = alertsResponse.body;
      expect(Array.isArray(alerts)).toBe(true);

      // Find the cashbox difference alert
      const cashboxAlert = alerts.find(
        (alert: any) =>
          alert.type === AlertType.CASHBOX_DIFFERENCE &&
          alert.cashbox_id === cashbox.id,
      );

      expect(cashboxAlert).toBeDefined();
      expect(cashboxAlert.severity).toBe(AlertSeverity.WARNING);
      expect(cashboxAlert.is_read).toBe(false);
      expect(cashboxAlert.message).toContain('Diferencia en caja');
      expect(cashboxAlert.message).toContain('500'); // Difference amount
    });

    it('should not allow operator to close cashbox without proper balance', async () => {
      // Create a new cashbox
      const openCashboxData = {
        opening_balance_ars: 5000,
        opening_balance_usd: 0,
      };

      const createCashboxResponse = await request(app.getHttpServer())
        .post('/api/cashboxes')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(openCashboxData)
        .expect(201);

      const newCashbox = createCashboxResponse.body;

      // Try to close with negative balance (should fail validation)
      const closeCashboxData = {
        closing_balance_ars: -100,
        closing_balance_usd: 0,
      };

      await request(app.getHttpServer())
        .post(`/api/cashboxes/${newCashbox.id}/close`)
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(closeCashboxData)
        .expect(400);
    });

    it('should allow Direction to approve cashbox difference', async () => {
      // Create a cashbox with difference
      const openCashboxData = {
        opening_balance_ars: 8000,
        opening_balance_usd: 0,
      };

      const createCashboxResponse = await request(app.getHttpServer())
        .post('/api/cashboxes')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(openCashboxData)
        .expect(201);

      const testCashbox = createCashboxResponse.body;

      // Close with difference
      const closeCashboxData = {
        closing_balance_ars: 7500,
        closing_balance_usd: 0,
      };

      await request(app.getHttpServer())
        .post(`/api/cashboxes/${testCashbox.id}/close`)
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(closeCashboxData)
        .expect(200);

      // Get the alert
      const alertsResponse = await request(app.getHttpServer())
        .get('/api/alerts')
        .set(await dataBuilder.getAuthHeaders(directionToken))
        .expect(200);

      const alerts = alertsResponse.body;
      const cashboxAlert = alerts.find(
        (alert: any) =>
          alert.type === AlertType.CASHBOX_DIFFERENCE &&
          alert.cashbox_id === testCashbox.id,
      );

      expect(cashboxAlert).toBeDefined();

      // Approve the difference as Direction
      const approveResponse = await request(app.getHttpServer())
        .post(`/api/cashboxes/${testCashbox.id}/approve-difference`)
        .set(await dataBuilder.getAuthHeaders(directionToken))
        .send({ approved: true })
        .expect(200);

      expect(approveResponse.body.difference_approved).toBe(true);

      // Verify alert is still present but difference is approved
      const updatedAlertsResponse = await request(app.getHttpServer())
        .get('/api/alerts')
        .set(await dataBuilder.getAuthHeaders(directionToken))
        .expect(200);

      const updatedAlerts = updatedAlertsResponse.body;
      const updatedAlert = updatedAlerts.find(
        (alert: any) =>
          alert.type === AlertType.CASHBOX_DIFFERENCE &&
          alert.cashbox_id === testCashbox.id,
      );

      // Alert should still exist but cashbox difference is approved
      expect(updatedAlert).toBeDefined();
    });

    it('should not allow non-Direction users to approve differences', async () => {
      // Create and close a cashbox with difference
      const openCashboxData = {
        opening_balance_ars: 6000,
        opening_balance_usd: 0,
      };

      const createCashboxResponse = await request(app.getHttpServer())
        .post('/api/cashboxes')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(openCashboxData)
        .expect(201);

      const testCashbox = createCashboxResponse.body;

      const closeCashboxData = {
        closing_balance_ars: 5500,
        closing_balance_usd: 0,
      };

      await request(app.getHttpServer())
        .post(`/api/cashboxes/${testCashbox.id}/close`)
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(closeCashboxData)
        .expect(200);

      // Try to approve as Admin (should fail - only Direction can approve)
      await request(app.getHttpServer())
        .post(`/api/cashboxes/${testCashbox.id}/approve-difference`)
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .send({ approved: true })
        .expect(403);

      // Try to approve as Operator (should fail)
      await request(app.getHttpServer())
        .post(`/api/cashboxes/${testCashbox.id}/approve-difference`)
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send({ approved: true })
        .expect(403);
    });

    it('should handle cashbox closure with no difference (no alert generated)', async () => {
      // Create a cashbox
      const openCashboxData = {
        opening_balance_ars: 12000,
        opening_balance_usd: 0,
      };

      const createCashboxResponse = await request(app.getHttpServer())
        .post('/api/cashboxes')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(openCashboxData)
        .expect(201);

      const testCashbox = createCashboxResponse.body;

      // Close with exact balance (no difference)
      const closeCashboxData = {
        closing_balance_ars: 12000,
        closing_balance_usd: 0,
      };

      await request(app.getHttpServer())
        .post(`/api/cashboxes/${testCashbox.id}/close`)
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(closeCashboxData)
        .expect(200);

      // Verify no cashbox difference alert was generated
      const alertsResponse = await request(app.getHttpServer())
        .get('/api/alerts')
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(200);

      const alerts = alertsResponse.body;
      const cashboxAlert = alerts.find(
        (alert: any) =>
          alert.type === AlertType.CASHBOX_DIFFERENCE &&
          alert.cashbox_id === testCashbox.id,
      );

      // Should not find an alert for this cashbox
      expect(cashboxAlert).toBeUndefined();
    });
  });

  describe('Error Cases', () => {
    it('should not allow closing already closed cashbox', async () => {
      // Create and close a cashbox
      const openCashboxData = {
        opening_balance_ars: 7000,
        opening_balance_usd: 0,
      };

      const createCashboxResponse = await request(app.getHttpServer())
        .post('/api/cashboxes')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(openCashboxData)
        .expect(201);

      const testCashbox = createCashboxResponse.body;

      const closeCashboxData = {
        closing_balance_ars: 7000,
        closing_balance_usd: 0,
      };

      await request(app.getHttpServer())
        .post(`/api/cashboxes/${testCashbox.id}/close`)
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(closeCashboxData)
        .expect(200);

      // Try to close again (should fail)
      await request(app.getHttpServer())
        .post(`/api/cashboxes/${testCashbox.id}/close`)
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(closeCashboxData)
        .expect(400);
    });

    it('should not allow operator to close another operator\'s cashbox', async () => {
      // Create a second operator
      const operator2User = await dataBuilder.createUser(
        'operator2@test.com',
        'password123',
        UserRole.OPERATOR,
      );

      const operator2Login = await dataBuilder.loginUser(
        app,
        'operator2@test.com',
        'password123',
      );
      const operator2Token = operator2Login.token;

      // Operator 1 creates a cashbox
      const openCashboxData = {
        opening_balance_ars: 9000,
        opening_balance_usd: 0,
      };

      const createCashboxResponse = await request(app.getHttpServer())
        .post('/api/cashboxes')
        .set(await dataBuilder.getAuthHeaders(operatorToken))
        .send(openCashboxData)
        .expect(201);

      const testCashbox = createCashboxResponse.body;

      // Operator 2 tries to close Operator 1's cashbox (should fail)
      const closeCashboxData = {
        closing_balance_ars: 9000,
        closing_balance_usd: 0,
      };

      await request(app.getHttpServer())
        .post(`/api/cashboxes/${testCashbox.id}/close`)
        .set(await dataBuilder.getAuthHeaders(operator2Token))
        .send(closeCashboxData)
        .expect(403);
    });
  });
});

