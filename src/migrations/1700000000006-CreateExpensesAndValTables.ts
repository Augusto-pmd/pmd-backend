import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExpensesAndValTables1700000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create expenses table
    await queryRunner.query(`
      CREATE TABLE "expenses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "work_id" uuid NOT NULL,
        "supplier_id" uuid,
        "rubric_id" uuid NOT NULL,
        "amount" decimal(15,2) NOT NULL,
        "currency" "currency_enum" NOT NULL,
        "purchase_date" date NOT NULL,
        "document_type" "document_type_enum" NOT NULL,
        "document_number" varchar(100),
        "state" "expense_state_enum" NOT NULL DEFAULT 'pending',
        "file_url" varchar(500),
        "observations" text,
        "created_by_id" uuid NOT NULL,
        "validated_by_id" uuid,
        "validated_at" TIMESTAMP,
        "vat_amount" decimal(15,2),
        "vat_rate" decimal(5,2),
        "vat_perception" decimal(15,2),
        "vat_withholding" decimal(15,2),
        "iibb_perception" decimal(15,2),
        "income_tax_withholding" decimal(15,2),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_expenses" PRIMARY KEY ("id"),
        CONSTRAINT "FK_expenses_work" FOREIGN KEY ("work_id") 
          REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_expenses_supplier" FOREIGN KEY ("supplier_id") 
          REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "FK_expenses_rubric" FOREIGN KEY ("rubric_id") 
          REFERENCES "rubrics"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "FK_expenses_created_by" FOREIGN KEY ("created_by_id") 
          REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "FK_expenses_validated_by" FOREIGN KEY ("validated_by_id") 
          REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create indexes on expenses
    await queryRunner.query(`
      CREATE INDEX "IDX_expenses_work_id" ON "expenses"("work_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_expenses_supplier_id" ON "expenses"("supplier_id") WHERE "supplier_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_expenses_rubric_id" ON "expenses"("rubric_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_expenses_state" ON "expenses"("state");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_expenses_purchase_date" ON "expenses"("purchase_date");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_expenses_document_type" ON "expenses"("document_type");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_expenses_created_by_id" ON "expenses"("created_by_id");
    `);

    // Create val table
    await queryRunner.query(`
      CREATE TABLE "val" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" varchar(50) NOT NULL UNIQUE,
        "expense_id" uuid NOT NULL UNIQUE,
        "file_url" varchar(500),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_val" PRIMARY KEY ("id"),
        CONSTRAINT "FK_val_expense" FOREIGN KEY ("expense_id") 
          REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Create indexes on val
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_val_code" ON "val"("code");
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_val_expense_id" ON "val"("expense_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "val"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "expenses"`);
  }
}

