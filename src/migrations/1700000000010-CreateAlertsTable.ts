import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAlertsTable1700000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create alerts table
    await queryRunner.query(`
      CREATE TABLE "alerts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "alert_type_enum" NOT NULL,
        "severity" "alert_severity_enum" NOT NULL DEFAULT 'info',
        "title" varchar(255) NOT NULL,
        "message" text NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "user_id" uuid,
        "work_id" uuid,
        "supplier_id" uuid,
        "expense_id" uuid,
        "contract_id" uuid,
        "cashbox_id" uuid,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alerts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_alerts_user" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "FK_alerts_work" FOREIGN KEY ("work_id") 
          REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_alerts_supplier" FOREIGN KEY ("supplier_id") 
          REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_alerts_expense" FOREIGN KEY ("expense_id") 
          REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_alerts_contract" FOREIGN KEY ("contract_id") 
          REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_alerts_cashbox" FOREIGN KEY ("cashbox_id") 
          REFERENCES "cashboxes"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Create indexes on alerts
    await queryRunner.query(`
      CREATE INDEX "IDX_alerts_type" ON "alerts"("type");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_alerts_severity" ON "alerts"("severity");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_alerts_is_read" ON "alerts"("is_read");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_alerts_user_id" ON "alerts"("user_id") WHERE "user_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_alerts_work_id" ON "alerts"("work_id") WHERE "work_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_alerts_created_at" ON "alerts"("created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "alerts"`);
  }
}

