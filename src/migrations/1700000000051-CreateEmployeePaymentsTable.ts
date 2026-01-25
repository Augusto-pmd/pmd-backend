import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmployeePaymentsTable1700000000051 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "employee_payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employee_id" uuid NOT NULL,
        "week_start_date" date NOT NULL,
        "days_worked" integer NOT NULL,
        "total_salary" decimal(15,2) NOT NULL,
        "late_hours" decimal(10,2),
        "late_deduction" decimal(15,2) NOT NULL,
        "total_advances" decimal(15,2) NOT NULL,
        "net_payment" decimal(15,2) NOT NULL,
        "paid_at" TIMESTAMP,
        "expense_id" uuid,
        "organization_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_employee_payments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_employee_payments_employee" FOREIGN KEY ("employee_id")
          REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_employee_payments_expense" FOREIGN KEY ("expense_id")
          REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "FK_employee_payments_organization" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_employee_payments_employee_id" ON "employee_payments"("employee_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_employee_payments_week_start_date" ON "employee_payments"("week_start_date");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_employee_payments_employee_week" ON "employee_payments"("employee_id", "week_start_date");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_employee_payments_organization_id" ON "employee_payments"("organization_id") WHERE "organization_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_employee_payments_paid_at" ON "employee_payments"("paid_at") WHERE "paid_at" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "employee_payments"`);
  }
}

