import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContractorBudgetLowAlertType1700000000053 implements MigrationInterface {
  name = 'AddContractorBudgetLowAlertType1700000000053';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new alert type value to alert_type_enum (Postgres limitation: cannot run inside tx)
    const connection = queryRunner.connection;
    const driver = connection.driver as any;
    const pool = driver.master || driver.pool;

    if (!pool || typeof pool.query !== 'function') {
      // Fall back to queryRunner (may fail if wrapped in tx, but try anyway)
      await queryRunner.query(
        `ALTER TYPE "alert_type_enum" ADD VALUE IF NOT EXISTS 'contractor_budget_low';`,
      );
      return;
    }

    await pool.query(
      `ALTER TYPE "alert_type_enum" ADD VALUE IF NOT EXISTS 'contractor_budget_low';`,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL does not support removing enum values safely
    console.warn(
      'Cannot remove enum value "contractor_budget_low" from alert_type_enum. Manual intervention required if needed.',
    );
  }
}

