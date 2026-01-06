import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add payment_method enum and column to incomes table
 * 
 * This column was defined in the Income entity but was missing from the initial migration.
 * Adding it now to align the database schema with the entity definition.
 */
export class AddPaymentMethodToIncomes1700000000031 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if payment_method_enum already exists
    const enumCheck = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM pg_type 
        WHERE typname = 'payment_method_enum'
      ) as exists;
    `);

    if (!enumCheck[0].exists) {
      // Create payment_method_enum
      await queryRunner.query(`
        CREATE TYPE "payment_method_enum" AS ENUM ('transfer', 'check', 'cash', 'payment_link');
      `);
    }

    // Check if payment_method column already exists
    const columnCheck = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'incomes' 
        AND column_name = 'payment_method'
      ) as exists;
    `);

    if (!columnCheck[0].exists) {
      // Add the payment_method column
      await queryRunner.query(`
        ALTER TABLE "incomes" 
        ADD COLUMN "payment_method" "payment_method_enum" NULL;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop column first
    await queryRunner.query(`
      ALTER TABLE "incomes" 
      DROP COLUMN IF EXISTS "payment_method";
    `);
    
    // Drop enum (only if no other tables are using it)
    await queryRunner.query(`
      DROP TYPE IF EXISTS "payment_method_enum";
    `);
  }
}

