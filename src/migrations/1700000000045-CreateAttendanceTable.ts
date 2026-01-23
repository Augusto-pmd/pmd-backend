import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttendanceTable1700000000045 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "attendance_status_enum" AS ENUM (
        'present',
        'absent',
        'late'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "attendance" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employee_id" uuid NOT NULL,
        "date" date NOT NULL,
        "status" "attendance_status_enum" NOT NULL DEFAULT 'present',
        "late_hours" decimal(5,2),
        "week_start_date" date NOT NULL,
        "organization_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attendance" PRIMARY KEY ("id"),
        CONSTRAINT "FK_attendance_organization" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Note: Foreign key to employees table will be added when Employee entity exists
    // For now, we create the table without the FK constraint
    // ALTER TABLE "attendance" ADD CONSTRAINT "FK_attendance_employee" 
    //   FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    await queryRunner.query(`
      CREATE INDEX "IDX_attendance_employee_id" ON "attendance"("employee_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_attendance_date" ON "attendance"("date");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_attendance_week_start_date" ON "attendance"("week_start_date");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_attendance_organization_id" ON "attendance"("organization_id") WHERE "organization_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_attendance_employee_week" ON "attendance"("employee_id", "week_start_date");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "attendance"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "attendance_status_enum"`);
  }
}
