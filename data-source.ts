import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Role } from './src/roles/role.entity';
import { User } from './src/users/user.entity';
import { Rubric } from './src/rubrics/rubrics.entity';
import { Supplier } from './src/suppliers/suppliers.entity';
import { SupplierDocument } from './src/supplier-documents/supplier-documents.entity';
import { Work } from './src/works/works.entity';
import { WorkBudget } from './src/work-budgets/work-budgets.entity';
import { Contract } from './src/contracts/contracts.entity';
import { Cashbox } from './src/cashboxes/cashboxes.entity';
import { CashMovement } from './src/cash-movements/cash-movements.entity';
import { Expense } from './src/expenses/expenses.entity';
import { Val } from './src/val/val.entity';
import { Income } from './src/incomes/incomes.entity';
import { Schedule } from './src/schedule/schedule.entity';
import { Alert } from './src/alerts/alerts.entity';
import { AccountingRecord } from './src/accounting/accounting.entity';
import { AuditLog } from './src/audit/audit.entity';

// Load environment variables
config();

const connectionOptions = {
  type: 'postgres' as const,
  url: process.env.DATABASE_URL,
  entities: [
    Role,
    User,
    Rubric,
    Supplier,
    SupplierDocument,
    Work,
    WorkBudget,
    Contract,
    Cashbox,
    CashMovement,
    Expense,
    Val,
    Income,
    Schedule,
    Alert,
    AccountingRecord,
    AuditLog,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  ssl: {
    rejectUnauthorized: false
  }
};

export default new DataSource(connectionOptions);
