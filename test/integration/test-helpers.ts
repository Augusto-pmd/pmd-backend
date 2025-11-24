/**
 * Integration test helpers and utilities
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestDatabaseModule, getTestDataSource } from './test-database.module';
import { UserRole } from '../../src/common/enums/user-role.enum';
import { Role } from '../../src/roles/roles.entity';
import { User } from '../../src/users/users.entity';
import * as bcrypt from 'bcrypt';

export class TestApp {
  private app: INestApplication;
  private moduleFixture: TestingModule;
  private dataSource: DataSource;

  async setup(): Promise<void> {
    this.moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(TypeOrmModule)
      .useModule(TestDatabaseModule)
      .compile();

    this.app = this.moduleFixture.createNestApplication();
    this.app.setGlobalPrefix('api');
    await this.app.init();

    this.dataSource = this.moduleFixture.get(DataSource);
    
    // Run migrations or sync schema
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }
  }

  async teardown(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.dropDatabase();
      await this.dataSource.destroy();
    }
    if (this.app) {
      await this.app.close();
    }
  }

  getApp(): INestApplication {
    return this.app;
  }

  getDataSource(): DataSource {
    return this.dataSource;
  }

  getHttpServer() {
    return this.app.getHttpServer();
  }
}

export class TestDataBuilder {
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  async createRole(name: UserRole, description?: string): Promise<Role> {
    const roleRepo = this.dataSource.getRepository(Role);
    const role = roleRepo.create({
      name,
      description: description || `${name} role`,
      permissions: {},
    });
    return await roleRepo.save(role);
  }

  async createUser(
    email: string,
    password: string,
    roleName: UserRole,
    overrides?: Partial<User>,
  ): Promise<User> {
    const userRepo = this.dataSource.getRepository(User);
    const roleRepo = this.dataSource.getRepository(Role);

    let role = await roleRepo.findOne({ where: { name: roleName } });
    if (!role) {
      role = await this.createRole(roleName);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = userRepo.create({
      name: overrides?.name || 'Test User',
      email,
      password: hashedPassword,
      role_id: role.id,
      is_active: overrides?.is_active !== undefined ? overrides.is_active : true,
      ...overrides,
    });

    const savedUser = await userRepo.save(user);
    return await userRepo.findOne({
      where: { id: savedUser.id },
      relations: ['role'],
    });
  }

  async createRubric(name: string, code?: string): Promise<any> {
    const { Rubric } = await import('../../src/rubrics/rubrics.entity');
    const rubricRepo = this.dataSource.getRepository(Rubric);
    const rubric = rubricRepo.create({
      name,
      code: code || `RUB-${name.substring(0, 3).toUpperCase()}`,
      is_active: true,
    });
    return await rubricRepo.save(rubric);
  }

  async createWork(
    name: string,
    currency: string,
    supervisorId?: string,
    overrides?: any,
  ): Promise<any> {
    const { Work } = await import('../../src/works/works.entity');
    const workRepo = this.dataSource.getRepository(Work);
    const work = workRepo.create({
      name,
      client: 'Test Client',
      address: 'Test Address',
      start_date: new Date(),
      status: 'active',
      currency,
      supervisor_id: supervisorId,
      total_budget: 100000,
      total_expenses: 0,
      total_incomes: 0,
      ...overrides,
    });
    return await workRepo.save(work);
  }

  async createSupplier(
    name: string,
    status: string,
    createdById?: string,
  ): Promise<any> {
    const { Supplier } = await import('../../src/suppliers/suppliers.entity');
    const supplierRepo = this.dataSource.getRepository(Supplier);
    const supplier = supplierRepo.create({
      name,
      cuit: `20-${Math.floor(Math.random() * 100000000)}-9`,
      email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
      status,
      created_by_id: createdById,
    });
    return await supplierRepo.save(supplier);
  }

  async createSupplierDocument(
    supplierId: string,
    documentType: string,
    expirationDate?: Date,
  ): Promise<any> {
    const { SupplierDocument } = await import('../../src/supplier-documents/supplier-documents.entity');
    const docRepo = this.dataSource.getRepository(SupplierDocument);
    const doc = docRepo.create({
      supplier_id: supplierId,
      document_type: documentType,
      expiration_date: expirationDate || new Date('2025-12-31'),
      is_valid: true,
    });
    return await docRepo.save(doc);
  }

  async createContract(
    workId: string,
    supplierId: string,
    rubricId: string,
    amountTotal: number,
    currency: string,
  ): Promise<any> {
    const { Contract } = await import('../../src/contracts/contracts.entity');
    const contractRepo = this.dataSource.getRepository(Contract);
    const contract = contractRepo.create({
      work_id: workId,
      supplier_id: supplierId,
      rubric_id: rubricId,
      amount_total: amountTotal,
      amount_executed: 0,
      currency,
      is_blocked: false,
    });
    return await contractRepo.save(contract);
  }

  async createCashbox(
    userId: string,
    status: string,
    openingBalanceArs: number = 0,
    openingBalanceUsd: number = 0,
  ): Promise<any> {
    const { Cashbox } = await import('../../src/cashboxes/cashboxes.entity');
    const cashboxRepo = this.dataSource.getRepository(Cashbox);
    const cashbox = cashboxRepo.create({
      user_id: userId,
      status,
      opening_balance_ars: openingBalanceArs,
      opening_balance_usd: openingBalanceUsd,
      closing_balance_ars: 0,
      closing_balance_usd: 0,
      difference_ars: 0,
      difference_usd: 0,
      opening_date: new Date(),
    });
    return await cashboxRepo.save(cashbox);
  }

  async loginUser(
    app: INestApplication,
    email: string,
    password: string,
  ): Promise<{ token: string; user: any }> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    return {
      token: response.body.access_token,
      user: response.body.user,
    };
  }

  async getAuthHeaders(token: string): Promise<{ Authorization: string }> {
    return {
      Authorization: `Bearer ${token}`,
    };
  }
}

