import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupplierTypeAndFiscalCondition1700000000022 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create SupplierType enum if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "supplier_type_enum" AS ENUM ('labor', 'materials', 'contractor', 'services', 'logistics', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create FiscalCondition enum if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "fiscal_condition_enum" AS ENUM ('ri', 'monotributista', 'exempt', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add type column to suppliers table if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "suppliers" ADD COLUMN "type" "supplier_type_enum";
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // Add fiscal_condition column to suppliers table if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "suppliers" ADD COLUMN "fiscal_condition" "fiscal_condition_enum";
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // Create index on type column (partial index for non-null values)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE indexname = 'IDX_suppliers_type'
        ) THEN
          CREATE INDEX "IDX_suppliers_type" ON "suppliers"("type") WHERE "type" IS NOT NULL;
        END IF;
      END $$;
    `);

    // Create index on fiscal_condition column (partial index for non-null values)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE indexname = 'IDX_suppliers_fiscal_condition'
        ) THEN
          CREATE INDEX "IDX_suppliers_fiscal_condition" ON "suppliers"("fiscal_condition") WHERE "fiscal_condition" IS NOT NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE indexname = 'IDX_suppliers_fiscal_condition'
        ) THEN
          DROP INDEX "IDX_suppliers_fiscal_condition";
        END IF;
      END $$;
    `);
    
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE indexname = 'IDX_suppliers_type'
        ) THEN
          DROP INDEX "IDX_suppliers_type";
        END IF;
      END $$;
    `);

    // Drop columns
    await queryRunner.query(`ALTER TABLE "suppliers" DROP COLUMN IF EXISTS "fiscal_condition"`);
    await queryRunner.query(`ALTER TABLE "suppliers" DROP COLUMN IF EXISTS "type"`);

    // Drop enums (only if no other tables use them)
    // Note: We don't drop the enums in case they're used elsewhere
    // await queryRunner.query(`DROP TYPE IF EXISTS "fiscal_condition_enum"`);
    // await queryRunner.query(`DROP TYPE IF EXISTS "supplier_type_enum"`);
  }
}

