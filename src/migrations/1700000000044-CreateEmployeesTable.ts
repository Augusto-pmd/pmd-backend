import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmployeesTable1700000000044 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "employee_trade_enum" AS ENUM (
        'albanileria',
        'steel_framing',
        'pintura',
        'plomeria',
        'electricidad'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "employees" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "full_name" varchar(255) NOT NULL,
        "email" varchar(255),
        "phone" varchar(50),
        "daily_salary" decimal(15,2),
        "trade" "employee_trade_enum",
        "work_id" uuid,
        "area" varchar(255),
        "position" varchar(255),
        "role" varchar(255),
        "subrole" varchar(255),
        "hire_date" date,
        "seguro" jsonb,
        "is_active" boolean NOT NULL DEFAULT true,
        "organization_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_employees" PRIMARY KEY ("id"),
        CONSTRAINT "FK_employees_work" FOREIGN KEY ("work_id")
          REFERENCES "works"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "FK_employees_organization" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_employees_work_id" ON "employees"("work_id") WHERE "work_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_employees_organization_id" ON "employees"("organization_id") WHERE "organization_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_employees_trade" ON "employees"("trade") WHERE "trade" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_employees_is_active" ON "employees"("is_active");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "employees"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "employee_trade_enum"`);
  }
}
