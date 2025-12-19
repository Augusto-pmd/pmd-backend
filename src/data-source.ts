import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Role } from './roles/role.entity';
import { User } from './users/user.entity';
import { Organization } from './organizations/organization.entity';
import { Rubric } from './rubrics/rubrics.entity';
import { Supplier } from './suppliers/suppliers.entity';
import { SupplierDocument } from './supplier-documents/supplier-documents.entity';
import { Work } from './works/works.entity';
import { WorkBudget } from './work-budgets/work-budgets.entity';
import { WorkDocument } from './work-documents/work-documents.entity';
import { Contract } from './contracts/contracts.entity';
import { Cashbox } from './cashboxes/cashboxes.entity';
import { CashMovement } from './cash-movements/cash-movements.entity';
import { Expense } from './expenses/expenses.entity';
import { Val } from './val/val.entity';
import { Income } from './incomes/incomes.entity';
import { Schedule } from './schedule/schedule.entity';
import { Alert } from './alerts/alerts.entity';
import { AccountingRecord } from './accounting/accounting.entity';
import { AuditLog } from './audit/audit.entity';

// Load environment variables
config();

// Determine if SSL is required
const nodeEnv = process.env.NODE_ENV || 'development';
const databaseUrl = process.env.DATABASE_URL;

// Parse DATABASE_URL to check if SSL is required
let requiresSsl = false;
if (databaseUrl) {
  try {
    const parsedUrl = new URL(databaseUrl);
    const sslMode = parsedUrl.searchParams.get('sslmode');
    requiresSsl = sslMode === 'require' || sslMode === 'prefer';
  } catch (error) {
    // If URL parsing fails, assume no SSL for local development
    requiresSsl = false;
  }
}

// For local development without DATABASE_URL, use individual variables
const connectionOptions: any = {
  type: 'postgres' as const,
  entities: [
    Role,
    User,
    Organization,
    Rubric,
    Supplier,
    SupplierDocument,
    Work,
    WorkBudget,
    WorkDocument,
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
  migrations: process.env.NODE_ENV === 'production' 
    ? ['dist/migrations/*.js']
    : ['src/migrations/*.ts'],
  synchronize: false,
  logging: nodeEnv === 'development',
};

// Configure connection based on environment
if (databaseUrl) {
  // Use DATABASE_URL (production or when explicitly set)
  connectionOptions.url = databaseUrl;
  if (requiresSsl) {
    connectionOptions.ssl = {
      rejectUnauthorized: false
    };
  }
} else {
  // Use individual variables (local development)
  connectionOptions.host = process.env.DB_HOST || 'localhost';
  connectionOptions.port = parseInt(process.env.DB_PORT || '5432', 10);
  connectionOptions.username = process.env.DB_USERNAME || 'postgres';
  connectionOptions.password = process.env.DB_PASSWORD || 'postgres';
  connectionOptions.database = process.env.DB_DATABASE || 'pmd_management';
  // No SSL for local development
  connectionOptions.ssl = false;
}

export default new DataSource(connectionOptions);

