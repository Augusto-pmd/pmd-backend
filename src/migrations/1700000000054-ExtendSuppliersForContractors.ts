import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendSuppliersForContractors1700000000054 implements MigrationInterface {
  name = 'ExtendSuppliersForContractors1700000000054';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add contractor-only columns (nullable so it doesn't affect non-contractors)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "suppliers" ADD COLUMN "weekly_payment" decimal(15,2);
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "suppliers" ADD COLUMN "contractor_budget" decimal(15,2);
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "suppliers" ADD COLUMN "contractor_total_paid" decimal(15,2);
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "suppliers" ADD COLUMN "contractor_remaining_balance" decimal(15,2);
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "suppliers" DROP COLUMN IF EXISTS "contractor_remaining_balance"`);
    await queryRunner.query(`ALTER TABLE "suppliers" DROP COLUMN IF EXISTS "contractor_total_paid"`);
    await queryRunner.query(`ALTER TABLE "suppliers" DROP COLUMN IF EXISTS "contractor_budget"`);
    await queryRunner.query(`ALTER TABLE "suppliers" DROP COLUMN IF EXISTS "weekly_payment"`);
  }
}

