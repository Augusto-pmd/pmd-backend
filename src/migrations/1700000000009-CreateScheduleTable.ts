import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateScheduleTable1700000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create work_schedule table
    await queryRunner.query(`
      CREATE TABLE "work_schedule" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "work_id" uuid NOT NULL,
        "stage_name" varchar(255) NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "actual_end_date" date,
        "state" "schedule_state_enum" NOT NULL DEFAULT 'pending',
        "order" integer,
        "description" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_work_schedule" PRIMARY KEY ("id"),
        CONSTRAINT "FK_work_schedule_work" FOREIGN KEY ("work_id") 
          REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Create indexes on work_schedule
    await queryRunner.query(`
      CREATE INDEX "IDX_work_schedule_work_id" ON "work_schedule"("work_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_work_schedule_state" ON "work_schedule"("state");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_work_schedule_end_date" ON "work_schedule"("end_date");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_work_schedule_work_order" ON "work_schedule"("work_id", "order");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "work_schedule"`);
  }
}

