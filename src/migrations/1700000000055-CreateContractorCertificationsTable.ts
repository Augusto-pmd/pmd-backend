import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContractorCertificationsTable1700000000055 implements MigrationInterface {
  name = 'CreateContractorCertificationsTable1700000000055';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "contractor_certifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "supplier_id" uuid NOT NULL,
        "week_start_date" date NOT NULL,
        "amount" decimal(15,2) NOT NULL,
        "description" text,
        "contract_id" uuid,
        "expense_id" uuid,
        "organization_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contractor_certifications_id" PRIMARY KEY ("id")
      )
    `);

    // Unique: one certification per supplier per week
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "contractor_certifications"
          ADD CONSTRAINT "UQ_contractor_certifications_supplier_week"
          UNIQUE ("supplier_id", "week_start_date");
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Foreign keys
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "contractor_certifications"
          ADD CONSTRAINT "FK_contractor_certifications_supplier"
          FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "contractor_certifications"
          ADD CONSTRAINT "FK_contractor_certifications_contract"
          FOREIGN KEY ("contract_id") REFERENCES "contracts"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "contractor_certifications"
          ADD CONSTRAINT "FK_contractor_certifications_expense"
          FOREIGN KEY ("expense_id") REFERENCES "expenses"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "contractor_certifications"
          ADD CONSTRAINT "FK_contractor_certifications_organization"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Indexes for common filters
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_contractor_certifications_supplier'
        ) THEN
          CREATE INDEX "IDX_contractor_certifications_supplier" ON "contractor_certifications"("supplier_id");
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_contractor_certifications_week'
        ) THEN
          CREATE INDEX "IDX_contractor_certifications_week" ON "contractor_certifications"("week_start_date");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "contractor_certifications"`);
  }
}

