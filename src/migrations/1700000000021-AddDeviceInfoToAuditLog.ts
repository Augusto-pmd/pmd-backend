import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeviceInfoToAuditLog1700000000021 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add device_info column to audit_log table
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'audit_log' AND column_name = 'device_info'
        ) THEN
          ALTER TABLE "audit_log"
          ADD COLUMN "device_info" jsonb;
        END IF;
      END $$;
    `);

    // Create index on device_info for better query performance (if needed)
    // Note: JSONB indexes are optional and depend on query patterns
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop column
    await queryRunner.query(`ALTER TABLE "audit_log" DROP COLUMN IF EXISTS "device_info"`);
  }
}

