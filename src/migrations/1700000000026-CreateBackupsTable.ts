import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBackupsTable1700000000026 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create backups table
    await queryRunner.query(`
      CREATE TYPE "backup_type_enum" AS ENUM('full', 'incremental');
      CREATE TYPE "backup_status_enum" AS ENUM('pending', 'in_progress', 'completed', 'failed');
    `);

    await queryRunner.query(`
      CREATE TABLE "backups" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "backup_type_enum" NOT NULL,
        "status" "backup_status_enum" NOT NULL DEFAULT 'pending',
        "file_path" varchar(500) NOT NULL,
        "storage_url" varchar(500) NULL,
        "file_size" bigint NOT NULL,
        "error_message" text NULL,
        "created_by_id" uuid NULL,
        "started_at" TIMESTAMP NULL,
        "completed_at" TIMESTAMP NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_backups" PRIMARY KEY ("id"),
        CONSTRAINT "FK_backups_created_by" FOREIGN KEY ("created_by_id") 
          REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_backups_type" ON "backups"("type");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_backups_status" ON "backups"("status");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_backups_created_at" ON "backups"("created_at" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_backups_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_backups_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_backups_type"`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "backups"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "backup_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "backup_type_enum"`);
  }
}

