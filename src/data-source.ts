import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
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
const baseOptions: Partial<DataSourceOptions> = {
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
  // Determinar qué ruta de migraciones usar
  // En producción: intentar usar compiladas, si no existen, usar fuente
  // En desarrollo: siempre usar fuente
  migrations: (() => {
    if (process.env.NODE_ENV === 'production') {
      const distMigrationsPath = path.join(process.cwd(), 'dist', 'migrations');
      if (fs.existsSync(distMigrationsPath)) {
        const files = fs.readdirSync(distMigrationsPath);
        if (files.some(f => f.endsWith('.js'))) {
          return ['dist/migrations/*.js'];
        }
      }
      // Fallback a fuente si no hay compiladas
      return ['src/migrations/*.ts'];
    }
    return ['src/migrations/*.ts'];
  })(),
  synchronize: false,
  logging: nodeEnv === 'development',
};

// Configure connection based on environment
const connectionOptions: DataSourceOptions = databaseUrl
  ? {
      ...baseOptions,
      url: databaseUrl,
      ...(requiresSsl && {
        ssl: {
          rejectUnauthorized: false
        }
      }),
    } as DataSourceOptions
  : {
      ...baseOptions,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'pmd_management',
      ssl: false,
    } as DataSourceOptions;

export default new DataSource(connectionOptions);

