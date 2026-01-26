import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { TestApp, TestDataBuilder } from './test-helpers';
import { Currency, SupplierStatus, SupplierType, DocumentType } from '../../src/common/enums';

describe('Contractor Certifications (e2e)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let dataBuilder: TestDataBuilder;
  let adminToken: string;
  let work: any;
  let rubric: any;
  let contractorSupplier: any;
  let contract: any;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup();
    app = testApp.getApp();
    dataBuilder = new TestDataBuilder(testApp.getDataSource());

    await dataBuilder.createRole('administration' as any);
    const adminUser = await dataBuilder.createUser(
      'admin.contractor@test.com',
      'password123',
      'administration' as any,
    );
    const adminLogin = await dataBuilder.loginUser(
      app,
      'admin.contractor@test.com',
      'password123',
    );
    adminToken = adminLogin.token;

    rubric = await dataBuilder.createRubric('Contractor', 'CTR');
    work = await dataBuilder.createWork('Contractor Work', Currency.ARS);

    // Create contractor supplier via API to ensure DTO works
    const supplierResponse = await request(app.getHttpServer())
      .post('/api/suppliers')
      .set(await dataBuilder.getAuthHeaders(adminToken))
      .send({
        name: 'Contratista SRL',
        cuit: '20-12345678-9',
        status: SupplierStatus.APPROVED,
        type: SupplierType.CONTRACTOR,
        weekly_payment: 100000,
        contractor_budget: 500000,
      })
      .expect(201);
    contractorSupplier = supplierResponse.body;

    contract = await dataBuilder.createContract(
      work.id,
      contractorSupplier.id,
      rubric.id,
      999999,
      Currency.ARS,
    );
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  it('creates certification and auto-creates expense (or allows manual creation)', async () => {
    const week = '2026-01-19';

    const certResp = await request(app.getHttpServer())
      .post('/api/contractor-certifications')
      .set(await dataBuilder.getAuthHeaders(adminToken))
      .send({
        supplier_id: contractorSupplier.id,
        week_start_date: week,
        amount: 123456,
        description: 'Certificación semanal',
        contract_id: contract.id,
      })
      .expect(201);

    expect(certResp.body.id).toBeDefined();
    expect(certResp.body.supplier_id).toBe(contractorSupplier.id);
    expect(String(certResp.body.week_start_date).slice(0, 10)).toBe(week);
    expect(Number(certResp.body.amount)).toBe(123456);

    // If auto expense succeeded, expense_id is present; otherwise we can create it manually
    const certId = certResp.body.id;

    if (!certResp.body.expense_id) {
      const expenseResp = await request(app.getHttpServer())
        .post(`/api/expenses/from-certification/${certId}`)
        .set(await dataBuilder.getAuthHeaders(adminToken))
        .expect(201);

      expect(expenseResp.body.id).toBeDefined();
      expect(expenseResp.body.work_id).toBe(work.id);
      expect(expenseResp.body.supplier_id).toBe(contractorSupplier.id);
      expect(expenseResp.body.contract_id).toBe(contract.id);
      expect(expenseResp.body.rubric_id).toBe(rubric.id);
      expect(expenseResp.body.document_type).toBe(DocumentType.RECEIPT);
    }

    // Supplier totals should be updated
    const supplierAfter = await request(app.getHttpServer())
      .get(`/api/suppliers/${contractorSupplier.id}`)
      .set(await dataBuilder.getAuthHeaders(adminToken))
      .expect(200);

    expect(Number(supplierAfter.body.contractor_total_paid)).toBeGreaterThanOrEqual(123456);
    expect(Number(supplierAfter.body.contractor_remaining_balance)).toBeLessThanOrEqual(500000);

    // Recibo imprimible (Fase 6)
    const receipt = await request(app.getHttpServer())
      .get(`/api/payroll/receipts/contractor/${contractorSupplier.id}/week/${week}`)
      .set(await dataBuilder.getAuthHeaders(adminToken))
      .expect(200);

    expect(receipt.body.type).toBe('contractor');
    expect(receipt.body.week_start_date).toBe(week);
    expect(receipt.body.contractor?.id).toBe(contractorSupplier.id);
    expect(Number(receipt.body.certification?.amount)).toBe(123456);
  });

  it('Fase 7: gastos de certificaciones deben aparecer en lista de gastos de la obra', async () => {
    const week = '2026-01-26';

    const certResp = await request(app.getHttpServer())
      .post('/api/contractor-certifications')
      .set(await dataBuilder.getAuthHeaders(adminToken))
      .send({
        supplier_id: contractorSupplier.id,
        week_start_date: week,
        amount: 200000,
        description: 'Certificación Fase 7',
        contract_id: contract.id,
      })
      .expect(201);

    expect(certResp.body.expense_id).toBeTruthy();

    // Verificar que el gasto aparece en la lista de gastos
    const expenses = await request(app.getHttpServer())
      .get('/api/expenses')
      .set(await dataBuilder.getAuthHeaders(adminToken))
      .expect(200);

    const certExpense = expenses.body.find((e: any) => e.id === certResp.body.expense_id);
    expect(certExpense).toBeTruthy();
    expect(certExpense.work_id).toBe(work.id);
    expect(certExpense.supplier_id).toBe(contractorSupplier.id);
    expect(String(certExpense.observations || '')).toContain('Certificación semanal');
  });

  it('Fase 7: eliminar certificación debe anular gasto automáticamente', async () => {
    const week = '2026-02-02';

    const certResp = await request(app.getHttpServer())
      .post('/api/contractor-certifications')
      .set(await dataBuilder.getAuthHeaders(adminToken))
      .send({
        supplier_id: contractorSupplier.id,
        week_start_date: week,
        amount: 300000,
        description: 'Certificación a eliminar',
        contract_id: contract.id,
      })
      .expect(201);

    expect(certResp.body.expense_id).toBeTruthy();

    // Verificar que el gasto existe y está PENDING
    const expenseBefore = await request(app.getHttpServer())
      .get(`/api/expenses/${certResp.body.expense_id}`)
      .set(await dataBuilder.getAuthHeaders(adminToken))
      .expect(200);

    expect(expenseBefore.body.state).toBe('pending');

    // Eliminar certificación
    await request(app.getHttpServer())
      .delete(`/api/contractor-certifications/${certResp.body.id}`)
      .set(await dataBuilder.getAuthHeaders(adminToken))
      .expect(200);

    // Verificar que el gasto fue anulado
    const expenseAfter = await request(app.getHttpServer())
      .get(`/api/expenses/${certResp.body.expense_id}`)
      .set(await dataBuilder.getAuthHeaders(adminToken))
      .expect(200);

    expect(expenseAfter.body.state).toBe('annulled');
    expect(String(expenseAfter.body.observations || '')).toContain('Anulado automáticamente por eliminación de certificación');
  });
});

