import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCashboxesTables1700000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create cashboxes table
    await queryRunner.query(`
      CREATE TABLE "cashboxes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "status" "cashbox_status_enum" NOT NULL DEFAULT 'open',
        "opening_balance_ars" decimal(15,2) NOT NULL DEFAULT 0,
        "opening_balance_usd" decimal(15,2) NOT NULL DEFAULT 0,
        "closing_balance_ars" decimal(15,2) NOT NULL DEFAULT 0,
        "closing_balance_usd" decimal(15,2) NOT NULL DEFAULT 0,
        "difference_ars" decimal(15,2) NOT NULL DEFAULT 0,
        "difference_usd" decimal(15,2) NOT NULL DEFAULT 0,
        "difference_approved" boolean NOT NULL DEFAULT false,
        "difference_approved_by_id" uuid,
        "difference_approved_at" TIMESTAMP,
        "opening_date" date NOT NULL,
        "closing_date" date,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cashboxes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_cashboxes_user" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "FK_cashboxes_approved_by" FOREIGN KEY ("difference_approved_by_id") 
          REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create indexes on cashboxes
    await queryRunner.query(`
      CREATE INDEX "IDX_cashboxes_user_id" ON "cashboxes"("user_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_cashboxes_status" ON "cashboxes"("status");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_cashboxes_opening_date" ON "cashboxes"("opening_date");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_cashboxes_user_status" ON "cashboxes"("user_id", "status");
    `);

    // Create cash_movements table
    await queryRunner.query(`
      CREATE TABLE "cash_movements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "cashbox_id" uuid NOT NULL,
        "type" "cash_movement_type_enum" NOT NULL,
        "amount" decimal(15,2) NOT NULL,
        "currency" "currency_enum" NOT NULL,
        "description" text,
        "expense_id" uuid,
        "income_id" uuid,
        "date" date NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cash_movements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_cash_movements_cashbox" FOREIGN KEY ("cashbox_id") 
          REFERENCES "cashboxes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_cash_movements_expense" FOREIGN KEY ("expense_id") 
          REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "FK_cash_movements_income" FOREIGN KEY ("income_id") 
          REFERENCES "incomes"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create indexes on cash_movements
    await queryRunner.query(`
      CREATE INDEX "IDX_cash_movements_cashbox_id" ON "cash_movements"("cashbox_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_cash_movements_type" ON "cash_movements"("type");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_cash_movements_date" ON "cash_movements"("date");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_cash_movements_expense_id" ON "cash_movements"("expense_id") WHERE "expense_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_cash_movements_income_id" ON "cash_movements"("income_id") WHERE "income_id" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "cash_movements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cashboxes"`);
  }
}

