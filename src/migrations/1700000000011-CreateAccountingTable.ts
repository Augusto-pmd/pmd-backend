import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAccountingTable1700000000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create accounting_records table
    await queryRunner.query(`
      CREATE TABLE "accounting_records" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "accounting_type" "accounting_type_enum" NOT NULL,
        "expense_id" uuid,
        "work_id" uuid,
        "supplier_id" uuid,
        "date" date NOT NULL,
        "month" integer NOT NULL,
        "year" integer NOT NULL,
        "month_status" "month_status_enum" NOT NULL DEFAULT 'open',
        "document_number" varchar(100),
        "description" varchar(255),
        "amount" decimal(15,2) NOT NULL,
        "currency" "currency_enum" NOT NULL,
        "vat_amount" decimal(15,2),
        "vat_rate" decimal(5,2),
        "vat_perception" decimal(15,2),
        "vat_withholding" decimal(15,2),
        "iibb_perception" decimal(15,2),
        "income_tax_withholding" decimal(15,2),
        "file_url" varchar(500),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_accounting_records" PRIMARY KEY ("id"),
        CONSTRAINT "FK_accounting_records_expense" FOREIGN KEY ("expense_id") 
          REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "FK_accounting_records_work" FOREIGN KEY ("work_id") 
          REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_accounting_records_supplier" FOREIGN KEY ("supplier_id") 
          REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "CHK_accounting_month" CHECK ("month" >= 1 AND "month" <= 12),
        CONSTRAINT "CHK_accounting_year" CHECK ("year" >= 2000)
      );
    `);

    // Create indexes on accounting_records
    await queryRunner.query(`
      CREATE INDEX "IDX_accounting_records_accounting_type" ON "accounting_records"("accounting_type");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_accounting_records_expense_id" ON "accounting_records"("expense_id") WHERE "expense_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_accounting_records_work_id" ON "accounting_records"("work_id") WHERE "work_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_accounting_records_supplier_id" ON "accounting_records"("supplier_id") WHERE "supplier_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_accounting_records_date" ON "accounting_records"("date");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_accounting_records_month_year" ON "accounting_records"("month", "year");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_accounting_records_month_status" ON "accounting_records"("month_status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "accounting_records"`);
  }
}

