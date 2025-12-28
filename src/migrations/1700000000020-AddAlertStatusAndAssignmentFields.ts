import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAlertStatusAndAssignmentFields1700000000020 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create alert_status_enum if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "alert_status_enum" AS ENUM ('open', 'in_review', 'resolved');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add status column to alerts table
    // PostgreSQL doesn't support NOT NULL with IF NOT EXISTS, so we need to check first
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'alerts' AND column_name = 'status'
        ) THEN
          ALTER TABLE "alerts"
          ADD COLUMN "status" "alert_status_enum" NOT NULL DEFAULT 'open';
        END IF;
      END $$;
    `);

    // Add assigned_to_id column
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'alerts' AND column_name = 'assigned_to_id'
        ) THEN
          ALTER TABLE "alerts"
          ADD COLUMN "assigned_to_id" uuid;
        END IF;
      END $$;
    `);

    // Add resolved_by_id column
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'alerts' AND column_name = 'resolved_by_id'
        ) THEN
          ALTER TABLE "alerts"
          ADD COLUMN "resolved_by_id" uuid;
        END IF;
      END $$;
    `);

    // Add resolved_at column
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'alerts' AND column_name = 'resolved_at'
        ) THEN
          ALTER TABLE "alerts"
          ADD COLUMN "resolved_at" TIMESTAMP;
        END IF;
      END $$;
    `);

    // Add foreign key constraint for assigned_to_id
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_alerts_assigned_to'
        ) THEN
          ALTER TABLE "alerts"
          ADD CONSTRAINT "FK_alerts_assigned_to"
          FOREIGN KEY ("assigned_to_id")
          REFERENCES "users"("id")
          ON DELETE SET NULL
          ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // Add foreign key constraint for resolved_by_id
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_alerts_resolved_by'
        ) THEN
          ALTER TABLE "alerts"
          ADD CONSTRAINT "FK_alerts_resolved_by"
          FOREIGN KEY ("resolved_by_id")
          REFERENCES "users"("id")
          ON DELETE SET NULL
          ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE indexname = 'IDX_alerts_status'
        ) THEN
          CREATE INDEX "IDX_alerts_status" ON "alerts"("status");
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE indexname = 'IDX_alerts_assigned_to_id'
        ) THEN
          CREATE INDEX "IDX_alerts_assigned_to_id" ON "alerts"("assigned_to_id") WHERE "assigned_to_id" IS NOT NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE indexname = 'IDX_alerts_resolved_by_id'
        ) THEN
          CREATE INDEX "IDX_alerts_resolved_by_id" ON "alerts"("resolved_by_id") WHERE "resolved_by_id" IS NOT NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE indexname = 'IDX_alerts_resolved_at'
        ) THEN
          CREATE INDEX "IDX_alerts_resolved_at" ON "alerts"("resolved_at") WHERE "resolved_at" IS NOT NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_alerts_resolved_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_alerts_resolved_by_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_alerts_assigned_to_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_alerts_status"`);

    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT IF EXISTS "FK_alerts_resolved_by"`);
    await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT IF EXISTS "FK_alerts_assigned_to"`);

    // Drop columns
    await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN IF EXISTS "resolved_at"`);
    await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN IF EXISTS "resolved_by_id"`);
    await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN IF EXISTS "assigned_to_id"`);
    await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN IF EXISTS "status"`);

    // Drop enum type (only if no other tables use it)
    await queryRunner.query(`DROP TYPE IF EXISTS "alert_status_enum"`);
  }
}

