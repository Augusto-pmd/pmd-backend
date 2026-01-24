/**
 * Integration test helpers and utilities
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import request = require('supertest');
import { AppModule } from '../../src/app.module';
import { TestDatabaseModule, getTestDataSource } from './test-database.module';
import { UserRole } from '../../src/common/enums/user-role.enum';
import { SupplierStatus } from '../../src/common/enums/supplier-status.enum';
import { Currency } from '../../src/common/enums/currency.enum';
import { SupplierDocumentType } from '../../src/common/enums/supplier-document-type.enum';
import { CashboxStatus } from '../../src/common/enums/cashbox-status.enum';
import { Role } from '../../src/roles/role.entity';
import { User } from '../../src/users/user.entity';
import { Organization } from '../../src/organizations/organization.entity';
import * as bcrypt from 'bcrypt';

export class TestApp {
  private app: INestApplication;
  private moduleFixture: TestingModule;
  private dataSource: DataSource;

  async setup(): Promise<void> {
    // Ensure test environment variables are set before creating the module
    // Set defaults if not already set
    process.env.TEST_DB_USERNAME = process.env.TEST_DB_USERNAME || 'postgres';
    process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'postgres';
    process.env.TEST_DB_HOST = process.env.TEST_DB_HOST || 'localhost';
    process.env.TEST_DB_PORT = process.env.TEST_DB_PORT || '5432';
    
    // Use base database name - workers will share the same DB but dropSchema will clean it
    // The dropSchema: true ensures clean state for each test suite
    process.env.TEST_DB_DATABASE = process.env.TEST_DB_DATABASE || 'pmd_management_test';
    
    // Override DB_* variables from TEST_DB_* to ensure AppModule uses test config
    // This prevents AppModule from using system username (Windows USERNAME env var)
    process.env.DB_USERNAME = process.env.TEST_DB_USERNAME;
    process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD;
    process.env.DB_HOST = process.env.TEST_DB_HOST;
    process.env.DB_PORT = process.env.TEST_DB_PORT;
    process.env.DB_DATABASE = process.env.TEST_DB_DATABASE;
    
    // Unset DATABASE_URL to prevent AppModule from using it
    // This is important because AppModule has a second TypeORM config that uses DATABASE_URL
    delete process.env.DATABASE_URL;
    
    this.moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(TypeOrmModule)
      .useModule(TestDatabaseModule)
      .compile();

    // Create and initialize the app first
    // This allows NestJS to initialize TypeORM, which will synchronize the schema
    this.app = this.moduleFixture.createNestApplication();
    this.app.setGlobalPrefix('api');
    
    // Get DataSource before initialization to ensure it's available
    this.dataSource = this.moduleFixture.get(DataSource);
    
    // Add a small random delay to avoid conflicts when multiple workers start simultaneously
    // This helps prevent "duplicate key" errors when creating ENUMs
    const randomDelay = Math.floor(Math.random() * 500);
    await new Promise(resolve => setTimeout(resolve, randomDelay));
    
    // Ensure DataSource is initialized before running migrations
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }
    
    // Create database if it doesn't exist
    const dbName = process.env.TEST_DB_DATABASE || 'pmd_management_test';
    try {
      // Connect to postgres database to create test database
      const adminDataSource = new DataSource({
        type: 'postgres',
        host: process.env.TEST_DB_HOST || 'localhost',
        port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
        username: process.env.TEST_DB_USERNAME || 'postgres',
        password: process.env.TEST_DB_PASSWORD || 'postgres',
        database: 'postgres', // Connect to default postgres database
      });
      
      await adminDataSource.initialize();
      
      // Check if database exists
      const dbExists = await adminDataSource.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [dbName]
      );
      
      if (dbExists.length === 0) {
        // Create database
        await adminDataSource.query(`CREATE DATABASE "${dbName}"`);
      }
      
      await adminDataSource.destroy();
    } catch (error: any) {
      // If database already exists or other error, continue
      // This is not critical if the database already exists
      if (!error.message?.includes('already exists')) {
        console.warn(`Warning: Could not ensure database exists: ${error.message}`);
      }
    }
    
    // Run migrations to create schema
    try {
      await this.dataSource.runMigrations();
    } catch (error: any) {
      // If migrations fail, try to continue anyway (might be already run)
      if (!error.message?.includes('already exists')) {
        console.warn(`Warning: Migration error (may be expected): ${error.message}`);
      }
    }
    
    // Initialize the app after migrations
    await this.app.init();
    
    // Verify schema is ready by checking for a key table
    // If it doesn't exist, wait a bit more with retries
    let retries = 30;
    let lastError: Error | null = null;
    while (retries > 0) {
      try {
        await this.dataSource.query('SELECT 1 FROM roles LIMIT 1');
        // Schema is ready, break out of retry loop
        break;
      } catch (error: any) {
        lastError = error;
        retries--;
        if (retries > 0) {
          // Wait a bit more before retrying
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }
    
    // If we've exhausted retries, throw an error with more context
    if (retries === 0 && lastError) {
      throw new Error(
        `Schema synchronization failed: roles table does not exist after 30 retries (6 seconds). ` +
        `DataSource initialized: ${this.dataSource.isInitialized}. ` +
        `Original error: ${lastError.message}`
      );
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

  async createOrganization(
    name: string,
    overrides?: Partial<Organization>,
  ): Promise<Organization> {
    const orgRepo = this.dataSource.getRepository(Organization);
    const org = orgRepo.create({
      name,
      description: overrides?.description ?? null,
      ...overrides,
    });
    return await orgRepo.save(org);
  }

  async createRole(name: UserRole, description?: string): Promise<Role> {
    const roleRepo = this.dataSource.getRepository(Role);
    
    // Check if role already exists
    let role = await roleRepo.findOne({ where: { name } });
    if (role) {
      return role;
    }
    
    // Create new role if it doesn't exist
    role = roleRepo.create({
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
      fullName: overrides?.fullName || 'Test User',
      email,
      password: hashedPassword,
      role: role,
      isActive: overrides?.isActive !== undefined ? overrides.isActive : true,
      ...overrides,
    });

    const savedUser = await userRepo.save(user);
    return await userRepo.findOne({
      where: { id: savedUser.id },
      relations: ['role', 'organization'],
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
    status: SupplierStatus,
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
    documentType: SupplierDocumentType,
    expirationDate?: Date,
  ): Promise<any> {
    const { SupplierDocument } = await import('../../src/supplier-documents/supplier-documents.entity');
    const docRepo = this.dataSource.getRepository(SupplierDocument);
    const doc = docRepo.create({
      supplier_id: supplierId,
      document_type: documentType as SupplierDocumentType,
      expiration_date: expirationDate || new Date('2025-12-31'),
      is_valid: true,
    } as any);
    return await docRepo.save(doc);
  }

  async createContract(
    workId: string,
    supplierId: string,
    rubricId: string,
    amountTotal: number,
    currency: Currency,
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
    status: CashboxStatus,
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
    } as any);
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

