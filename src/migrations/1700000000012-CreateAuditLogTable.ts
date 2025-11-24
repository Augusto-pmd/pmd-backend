import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogTable1700000000012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create audit_log table (immutable - no updated_at)
    await queryRunner.query(`
      CREATE TABLE "audit_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "action" varchar(100) NOT NULL,
        "module" varchar(100) NOT NULL,
        "entity_id" uuid,
        "entity_type" varchar(100),
        "previous_value" jsonb,
        "new_value" jsonb,
        "ip_address" varchar(50),
        "user_agent" varchar(500),
        "criticality" varchar(50),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_log" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_log_user" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create indexes on audit_log
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_log_user_id" ON "audit_log"("user_id") WHERE "user_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_log_module" ON "audit_log"("module");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_log_action" ON "audit_log"("action");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_log_entity" ON "audit_log"("entity_type", "entity_id") WHERE "entity_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_log_created_at" ON "audit_log"("created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_log"`);
  }
}

