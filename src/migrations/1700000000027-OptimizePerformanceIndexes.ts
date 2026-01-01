import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Performance optimization migration
 * Adds composite indexes to improve query performance for:
 * 1. Accounting reports (getPurchasesBook, getPerceptionsReport, getWithholdingsReport)
 * 2. Cashbox history queries (getHistory)
 */
export class OptimizePerformanceIndexes1700000000027 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Optimize accounting reports queries
    // Composite index for accounting_type + month + year (most common filter combination)
    await queryRunner.query(`
      CREATE INDEX "IDX_accounting_records_type_month_year" 
      ON "accounting_records"("accounting_type", "month", "year");
    `);

    // Composite index for month + year + work_id (for filtered reports by work)
    await queryRunner.query(`
      CREATE INDEX "IDX_accounting_records_month_year_work" 
      ON "accounting_records"("month", "year", "work_id") 
      WHERE "work_id" IS NOT NULL;
    `);

    // Composite index for month + year + supplier_id (for filtered reports by supplier)
    await queryRunner.query(`
      CREATE INDEX "IDX_accounting_records_month_year_supplier" 
      ON "accounting_records"("month", "year", "supplier_id") 
      WHERE "supplier_id" IS NOT NULL;
    `);

    // Index on organization_id in works table for organization filtering
    // Check if index exists before creating (since IF NOT EXISTS doesn't work with partial indexes)
    const indexExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'IDX_works_organization_id'
      );
    `);
    
    if (!indexExists[0].exists) {
      await queryRunner.query(`
        CREATE INDEX "IDX_works_organization_id" 
        ON "works"("organization_id") 
        WHERE "organization_id" IS NOT NULL;
      `);
    }

    // 2. Optimize cashbox history queries
    // Composite index for cashbox_id + date (most common filter, ordered by date DESC)
    await queryRunner.query(`
      CREATE INDEX "IDX_cash_movements_cashbox_date" 
      ON "cash_movements"("cashbox_id", "date" DESC);
    `);

    // Composite index for cashbox_id + type + date (for filtered history by type)
    await queryRunner.query(`
      CREATE INDEX "IDX_cash_movements_cashbox_type_date" 
      ON "cash_movements"("cashbox_id", "type", "date" DESC);
    `);

    // Composite index for cashbox_id + currency + date (for filtered history by currency)
    await queryRunner.query(`
      CREATE INDEX "IDX_cash_movements_cashbox_currency_date" 
      ON "cash_movements"("cashbox_id", "currency", "date" DESC);
    `);

    // Composite index for date range queries in cash_movements
    await queryRunner.query(`
      CREATE INDEX "IDX_cash_movements_date_range" 
      ON "cash_movements"("cashbox_id", "date");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes in reverse order
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cash_movements_date_range"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cash_movements_cashbox_currency_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cash_movements_cashbox_type_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cash_movements_cashbox_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_works_organization_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_accounting_records_month_year_supplier"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_accounting_records_month_year_work"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_accounting_records_type_month_year"`);
  }
}

