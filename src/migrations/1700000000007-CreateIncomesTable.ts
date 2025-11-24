import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIncomesTable1700000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create incomes table
    await queryRunner.query(`
      CREATE TABLE "incomes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "work_id" uuid NOT NULL,
        "type" "income_type_enum" NOT NULL,
        "amount" decimal(15,2) NOT NULL,
        "currency" "currency_enum" NOT NULL,
        "date" date NOT NULL,
        "file_url" varchar(500),
        "document_number" varchar(100),
        "is_validated" boolean NOT NULL DEFAULT false,
        "validated_by_id" uuid,
        "validated_at" TIMESTAMP,
        "observations" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_incomes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_incomes_work" FOREIGN KEY ("work_id") 
          REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_incomes_validated_by" FOREIGN KEY ("validated_by_id") 
          REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create indexes on incomes
    await queryRunner.query(`
      CREATE INDEX "IDX_incomes_work_id" ON "incomes"("work_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_incomes_type" ON "incomes"("type");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_incomes_date" ON "incomes"("date");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_incomes_is_validated" ON "incomes"("is_validated");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "incomes"`);
  }
}

