import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorksTables1700000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create works table
    await queryRunner.query(`
      CREATE TABLE "works" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "client" varchar(255) NOT NULL,
        "address" text NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date,
        "status" "work_status_enum" NOT NULL DEFAULT 'active',
        "currency" "currency_enum" NOT NULL,
        "supervisor_id" uuid,
        "total_budget" decimal(15,2) NOT NULL DEFAULT 0,
        "total_expenses" decimal(15,2) NOT NULL DEFAULT 0,
        "total_incomes" decimal(15,2) NOT NULL DEFAULT 0,
        "physical_progress" decimal(5,2) NOT NULL DEFAULT 0,
        "economic_progress" decimal(5,2) NOT NULL DEFAULT 0,
        "financial_progress" decimal(5,2) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_works" PRIMARY KEY ("id"),
        CONSTRAINT "FK_works_supervisor" FOREIGN KEY ("supervisor_id") 
          REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create indexes on works
    await queryRunner.query(`
      CREATE INDEX "IDX_works_status" ON "works"("status");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_works_currency" ON "works"("currency");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_works_supervisor_id" ON "works"("supervisor_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_works_start_date" ON "works"("start_date");
    `);

    // Create work_budgets table
    await queryRunner.query(`
      CREATE TABLE "work_budgets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "work_id" uuid NOT NULL,
        "type" "budget_type_enum" NOT NULL DEFAULT 'initial',
        "amount" decimal(15,2) NOT NULL,
        "description" varchar(500),
        "date" date NOT NULL,
        "file_url" varchar(500),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_work_budgets" PRIMARY KEY ("id"),
        CONSTRAINT "FK_work_budgets_work" FOREIGN KEY ("work_id") 
          REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Create indexes on work_budgets
    await queryRunner.query(`
      CREATE INDEX "IDX_work_budgets_work_id" ON "work_budgets"("work_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_work_budgets_type" ON "work_budgets"("type");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "work_budgets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "works"`);
  }
}

