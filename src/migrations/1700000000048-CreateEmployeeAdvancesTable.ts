import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmployeeAdvancesTable1700000000048 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "employee_advances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employee_id" uuid NOT NULL,
        "amount" decimal(15,2) NOT NULL,
        "date" date NOT NULL,
        "description" varchar(500),
        "week_start_date" date NOT NULL,
        "organization_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_employee_advances" PRIMARY KEY ("id"),
        CONSTRAINT "FK_employee_advances_employee" FOREIGN KEY ("employee_id")
          REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_employee_advances_organization" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_employee_advances_employee_id" ON "employee_advances"("employee_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_employee_advances_week_start_date" ON "employee_advances"("week_start_date");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_employee_advances_date" ON "employee_advances"("date");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_employee_advances_organization_id" ON "employee_advances"("organization_id") WHERE "organization_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_employee_advances_employee_week" ON "employee_advances"("employee_id", "week_start_date");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "employee_advances"`);
  }
}

