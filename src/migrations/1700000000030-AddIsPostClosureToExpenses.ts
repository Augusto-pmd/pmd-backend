import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add is_post_closure column to expenses table
 * 
 * This column was defined in the Expense entity but was missing from the initial migration.
 * Adding it now to align the database schema with the entity definition.
 */
export class AddIsPostClosureToExpenses1700000000030 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if is_post_closure column already exists
    const columnCheck = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'expenses' 
        AND column_name = 'is_post_closure'
      ) as exists;
    `);

    if (!columnCheck[0].exists) {
      // Add the is_post_closure column
      await queryRunner.query(`
        ALTER TABLE "expenses" 
        ADD COLUMN "is_post_closure" boolean NOT NULL DEFAULT false;
      `);

      // Create index for better query performance
      await queryRunner.query(`
        CREATE INDEX "IDX_expenses_is_post_closure" ON "expenses"("is_post_closure");
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_expenses_is_post_closure";
    `);
    
    // Drop column
    await queryRunner.query(`
      ALTER TABLE "expenses" 
      DROP COLUMN IF EXISTS "is_post_closure";
    `);
  }
}

