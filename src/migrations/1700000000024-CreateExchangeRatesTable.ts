import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExchangeRatesTable1700000000024 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create exchange_rates table
    await queryRunner.query(`
      CREATE TABLE "exchange_rates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "date" date NOT NULL,
        "rate_ars_to_usd" decimal(10,4) NOT NULL,
        "rate_usd_to_ars" decimal(10,4) NOT NULL,
        "created_by_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_exchange_rates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_exchange_rates_created_by" FOREIGN KEY ("created_by_id") 
          REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "UQ_exchange_rates_date" UNIQUE ("date")
      );
    `);

    // Create index on date column (already unique, but explicit index for performance)
    await queryRunner.query(`
      CREATE INDEX "IDX_exchange_rates_date" ON "exchange_rates"("date" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exchange_rates_date"`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "exchange_rates"`);
  }
}

