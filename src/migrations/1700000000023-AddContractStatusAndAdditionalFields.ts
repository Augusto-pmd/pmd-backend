import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContractStatusAndAdditionalFields1700000000023 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ContractStatus enum if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contract_status_enum" AS ENUM ('pending', 'approved', 'active', 'low_balance', 'no_balance', 'paused', 'finished', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add status column to contracts table if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "contracts" ADD COLUMN "status" "contract_status_enum" NOT NULL DEFAULT 'pending';
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // Add observations column if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "contracts" ADD COLUMN "observations" text;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // Add validity_date column if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "contracts" ADD COLUMN "validity_date" date;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // Add scope column if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "contracts" ADD COLUMN "scope" text;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // Add specifications column if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "contracts" ADD COLUMN "specifications" text;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // Add closed_by_id column if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "contracts" ADD COLUMN "closed_by_id" uuid;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // Add foreign key constraint for closed_by_id if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'FK_contracts_closed_by'
        ) THEN
          ALTER TABLE "contracts"
          ADD CONSTRAINT "FK_contracts_closed_by" 
          FOREIGN KEY ("closed_by_id") 
          REFERENCES "users"("id") 
          ON DELETE SET NULL 
          ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // Add closed_at column if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "contracts" ADD COLUMN "closed_at" TIMESTAMP;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // Create index on status column
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE indexname = 'IDX_contracts_status'
        ) THEN
          CREATE INDEX "IDX_contracts_status" ON "contracts"("status");
        END IF;
      END $$;
    `);

    // Create index on closed_by_id column
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE indexname = 'IDX_contracts_closed_by_id'
        ) THEN
          CREATE INDEX "IDX_contracts_closed_by_id" ON "contracts"("closed_by_id") WHERE "closed_by_id" IS NOT NULL;
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
          WHERE indexname = 'IDX_contracts_closed_by_id'
        ) THEN
          DROP INDEX "IDX_contracts_closed_by_id";
        END IF;
      END $$;
    `);
    
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE indexname = 'IDX_contracts_status'
        ) THEN
          DROP INDEX "IDX_contracts_status";
        END IF;
      END $$;
    `);

    // Drop foreign key constraint
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'FK_contracts_closed_by'
        ) THEN
          ALTER TABLE "contracts" DROP CONSTRAINT "FK_contracts_closed_by";
        END IF;
      END $$;
    `);

    // Drop columns
    await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN IF EXISTS "closed_at"`);
    await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN IF EXISTS "closed_by_id"`);
    await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN IF EXISTS "specifications"`);
    await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN IF EXISTS "scope"`);
    await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN IF EXISTS "validity_date"`);
    await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN IF EXISTS "observations"`);
    await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN IF EXISTS "status"`);

    // Drop enum (only if no other tables use it)
    // Note: We don't drop the enum in case it's used elsewhere
    // await queryRunner.query(`DROP TYPE IF EXISTS "contract_status_enum"`);
  }
}

