import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEnums1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create UserRole enum
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('direction', 'supervisor', 'administration', 'operator');
    `);

    // Create Currency enum
    await queryRunner.query(`
      CREATE TYPE "currency_enum" AS ENUM ('ARS', 'USD');
    `);

    // Create ExpenseState enum
    await queryRunner.query(`
      CREATE TYPE "expense_state_enum" AS ENUM ('pending', 'validated', 'observed', 'annulled');
    `);

    // Create WorkStatus enum
    await queryRunner.query(`
      CREATE TYPE "work_status_enum" AS ENUM ('active', 'paused', 'finished', 'administratively_closed', 'archived');
    `);

    // Create SupplierStatus enum
    await queryRunner.query(`
      CREATE TYPE "supplier_status_enum" AS ENUM ('provisional', 'approved', 'blocked', 'rejected');
    `);

    // Create DocumentType enum
    await queryRunner.query(`
      CREATE TYPE "document_type_enum" AS ENUM ('invoice_a', 'invoice_b', 'invoice_c', 'receipt', 'val');
    `);

    // Create SupplierDocumentType enum
    await queryRunner.query(`
      CREATE TYPE "supplier_document_type_enum" AS ENUM ('art', 'personal_accident_insurance', 'afip', 'iibb');
    `);

    // Create ScheduleState enum
    await queryRunner.query(`
      CREATE TYPE "schedule_state_enum" AS ENUM ('pending', 'in_progress', 'completed', 'delayed');
    `);

    // Create IncomeType enum
    await queryRunner.query(`
      CREATE TYPE "income_type_enum" AS ENUM ('advance', 'certification', 'final_payment');
    `);

    // Create AlertSeverity enum
    await queryRunner.query(`
      CREATE TYPE "alert_severity_enum" AS ENUM ('info', 'warning', 'critical');
    `);

    // Create AlertType enum
    await queryRunner.query(`
      CREATE TYPE "alert_type_enum" AS ENUM (
        'expired_documentation',
        'cashbox_difference',
        'contract_zero_balance',
        'duplicate_invoice',
        'overdue_stage',
        'observed_expense',
        'missing_validation',
        'pending_income_confirmation'
      );
    `);

    // Create AccountingType enum
    await queryRunner.query(`
      CREATE TYPE "accounting_type_enum" AS ENUM ('cash', 'fiscal');
    `);

    // Create CashMovementType enum
    await queryRunner.query(`
      CREATE TYPE "cash_movement_type_enum" AS ENUM ('income', 'expense', 'refill', 'difference');
    `);

    // Create CashboxStatus enum
    await queryRunner.query(`
      CREATE TYPE "cashbox_status_enum" AS ENUM ('open', 'closed');
    `);

    // Create MonthStatus enum
    await queryRunner.query(`
      CREATE TYPE "month_status_enum" AS ENUM ('open', 'closed');
    `);

    // Create BudgetType enum
    await queryRunner.query(`
      CREATE TYPE "budget_type_enum" AS ENUM ('initial', 'addenda');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TYPE IF EXISTS "budget_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "month_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "cashbox_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "cash_movement_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "accounting_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "alert_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "alert_severity_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "income_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "schedule_state_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "supplier_document_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "document_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "supplier_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "work_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "expense_state_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "currency_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
  }
}

