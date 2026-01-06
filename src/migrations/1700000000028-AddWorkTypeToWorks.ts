import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add work_type column to works table
 * 
 * This column was defined in the Work entity but was missing from the initial migration.
 * Adding it now to align the database schema with the entity definition.
 */
export class AddWorkTypeToWorks1700000000028 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, check if work_type_enum exists, if not create it
    const enumCheck = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM pg_type 
        WHERE typname = 'work_type_enum'
      ) as exists;
    `);

    if (!enumCheck[0].exists) {
      // Create the enum type
      await queryRunner.query(`
        CREATE TYPE "work_type_enum" AS ENUM ('house', 'local', 'expansion', 'renovation', 'other');
      `);
    }

    // Check if column already exists (for idempotency)
    const columnCheck = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'works' 
        AND column_name = 'work_type'
      ) as exists;
    `);

    if (!columnCheck[0].exists) {
      // Add the work_type column
      await queryRunner.query(`
        ALTER TABLE "works" 
        ADD COLUMN "work_type" "work_type_enum" NULL;
      `);

      // Create index on work_type for better query performance
      // Check if index exists first (PostgreSQL doesn't support IF NOT EXISTS for indexes)
      const indexCheck = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 
          FROM pg_indexes 
          WHERE schemaname = 'public'
          AND tablename = 'works' 
          AND indexname = 'IDX_works_work_type'
        ) as exists;
      `);

      if (!indexCheck[0].exists) {
        await queryRunner.query(`
          CREATE INDEX "IDX_works_work_type" ON "works"("work_type");
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_works_work_type"`);
    
    // Drop column
    await queryRunner.query(`ALTER TABLE "works" DROP COLUMN IF EXISTS "work_type"`);
    
    // Note: We don't drop the enum type as it might be used elsewhere
    // If you need to drop it, uncomment the following:
    // await queryRunner.query(`DROP TYPE IF EXISTS "work_type_enum"`);
  }
}

