import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Role } from '../../src/roles/role.entity';
import { User } from '../../src/users/user.entity';
import { Rubric } from '../../src/rubrics/rubrics.entity';
import { Supplier } from '../../src/suppliers/suppliers.entity';
import { SupplierDocument } from '../../src/supplier-documents/supplier-documents.entity';
import { Work } from '../../src/works/works.entity';
import { WorkBudget } from '../../src/work-budgets/work-budgets.entity';
import { Contract } from '../../src/contracts/contracts.entity';
import { Expense } from '../../src/expenses/expenses.entity';
import { Val } from '../../src/val/val.entity';
import { Income } from '../../src/incomes/incomes.entity';
import { Cashbox } from '../../src/cashboxes/cashboxes.entity';
import { CashMovement } from '../../src/cash-movements/cash-movements.entity';
import { Schedule } from '../../src/schedule/schedule.entity';
import { Alert } from '../../src/alerts/alerts.entity';
import { AccountingRecord } from '../../src/accounting/accounting.entity';
import { AuditLog } from '../../src/audit/audit.entity';

export const getTestDataSource = (): DataSourceOptions => ({
  type: 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
  username: process.env.TEST_DB_USERNAME || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
  database: process.env.TEST_DB_DATABASE || 'pmd_management_test',
  entities: [
    Role,
    User,
    Rubric,
    Supplier,
    SupplierDocument,
    Work,
    WorkBudget,
    Contract,
    Expense,
    Val,
    Income,
    Cashbox,
    CashMovement,
    Schedule,
    Alert,
    AccountingRecord,
    AuditLog,
  ],
  synchronize: true, // Use synchronize for tests (not recommended for production)
  dropSchema: true, // Drop schema before each test run
  logging: false,
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.test',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => getTestDataSource(),
    }),
  ],
})
export class TestDatabaseModule {}

