import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIncomeIdToAccountingRecords1700000000037 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const accountingTable = await queryRunner.getTable('accounting_records');
    const hasIncomeId = accountingTable?.findColumnByName('income_id');

    if (!hasIncomeId) {
      // Add income_id column
      await queryRunner.query(`
        ALTER TABLE "accounting_records"
        ADD COLUMN "income_id" uuid;
      `);

      // Add foreign key constraint
      await queryRunner.query(`
        ALTER TABLE "accounting_records"
        ADD CONSTRAINT "FK_accounting_records_income"
        FOREIGN KEY ("income_id")
        REFERENCES "incomes"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
      `);

      // Add index for better query performance
      await queryRunner.query(`
        CREATE INDEX "IDX_accounting_records_income_id"
        ON "accounting_records"("income_id") WHERE "income_id" IS NOT NULL;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_accounting_records_income_id"`);

    // Drop foreign key constraint
    await queryRunner.query(`ALTER TABLE "accounting_records" DROP CONSTRAINT IF EXISTS "FK_accounting_records_income"`);

    // Drop column
    await queryRunner.query(`ALTER TABLE "accounting_records" DROP COLUMN IF EXISTS "income_id"`);
  }
}

