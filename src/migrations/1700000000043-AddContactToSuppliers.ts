import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContactToSuppliers1700000000043 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add contact column to suppliers table if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "suppliers" ADD COLUMN "contact" varchar(255);
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove contact column from suppliers table
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "suppliers" DROP COLUMN IF EXISTS "contact";
      EXCEPTION
        WHEN undefined_table THEN null;
      END $$;
    `);
  }
}
