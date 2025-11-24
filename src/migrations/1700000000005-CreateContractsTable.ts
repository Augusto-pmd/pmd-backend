import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContractsTable1700000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create contracts table
    await queryRunner.query(`
      CREATE TABLE "contracts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "work_id" uuid NOT NULL,
        "supplier_id" uuid NOT NULL,
        "rubric_id" uuid NOT NULL,
        "amount_total" decimal(15,2) NOT NULL,
        "amount_executed" decimal(15,2) NOT NULL DEFAULT 0,
        "currency" "currency_enum" NOT NULL,
        "file_url" varchar(500),
        "payment_terms" text,
        "is_blocked" boolean NOT NULL DEFAULT false,
        "start_date" date,
        "end_date" date,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contracts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_contracts_work" FOREIGN KEY ("work_id") 
          REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_contracts_supplier" FOREIGN KEY ("supplier_id") 
          REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "FK_contracts_rubric" FOREIGN KEY ("rubric_id") 
          REFERENCES "rubrics"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);

    // Create indexes on contracts
    await queryRunner.query(`
      CREATE INDEX "IDX_contracts_work_id" ON "contracts"("work_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_contracts_supplier_id" ON "contracts"("supplier_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_contracts_rubric_id" ON "contracts"("rubric_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_contracts_is_blocked" ON "contracts"("is_blocked");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "contracts"`);
  }
}

