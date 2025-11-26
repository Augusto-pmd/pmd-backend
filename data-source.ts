import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Role } from './src/roles/roles.entity';
import { User } from './src/users/users.entity';
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

/**
 * Parse DATABASE_URL into connection options
 */
function parseDatabaseUrl(url: string): any {
  try {
    const parsedUrl = new URL(url);
    const options: any = {
      type: 'postgres',
      host: parsedUrl.hostname,
      port: parseInt(parsedUrl.port || '5432', 10),
      username: parsedUrl.username,
      password: parsedUrl.password,
      database: parsedUrl.pathname.slice(1), // Remove leading '/'
    };

    // Parse SSL mode from query string
    const sslMode = parsedUrl.searchParams.get('sslmode');
    if (sslMode === 'require' || sslMode === 'prefer') {
      options.ssl = {
        rejectUnauthorized: false,
      };
    }

    return options;
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL: ${error.message}`);
  }
}

// Get database configuration
const databaseUrl = process.env.DATABASE_URL;
let connectionOptions: any;

if (databaseUrl) {
  // Use DATABASE_URL (production - Render)
  const parsedOptions = parseDatabaseUrl(databaseUrl);
  connectionOptions = {
    ...parsedOptions,
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
    extra: parsedOptions.ssl ? {
      ssl: { rejectUnauthorized: false },
    } : undefined,
  };
} else {
  // Fallback to individual variables (development)
  connectionOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'pmd_management',
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
    ssl: false,
  };
}

export default new DataSource(connectionOptions);
