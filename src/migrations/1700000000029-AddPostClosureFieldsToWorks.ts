import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add post-closure expense fields to works table
 * 
 * These columns were defined in the Work entity but were missing from the initial migration.
 * Adding them now to align the database schema with the entity definition.
 */
export class AddPostClosureFieldsToWorks1700000000029 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if allow_post_closure_expenses column already exists
    const column1Check = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'works' 
        AND column_name = 'allow_post_closure_expenses'
      ) as exists;
    `);

    if (!column1Check[0].exists) {
      // Add the allow_post_closure_expenses column
      await queryRunner.query(`
        ALTER TABLE "works" 
        ADD COLUMN "allow_post_closure_expenses" boolean NOT NULL DEFAULT false;
      `);
    }

    // Check if post_closure_enabled_by_id column already exists
    const column2Check = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'works' 
        AND column_name = 'post_closure_enabled_by_id'
      ) as exists;
    `);

    if (!column2Check[0].exists) {
      // Add the post_closure_enabled_by_id column
      await queryRunner.query(`
        ALTER TABLE "works" 
        ADD COLUMN "post_closure_enabled_by_id" uuid NULL;
      `);

      // Add foreign key constraint
      await queryRunner.query(`
        ALTER TABLE "works" 
        ADD CONSTRAINT "FK_works_post_closure_enabled_by" 
        FOREIGN KEY ("post_closure_enabled_by_id") 
        REFERENCES "users"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
      `);
    }

    // Check if post_closure_enabled_at column already exists
    const column3Check = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'works' 
        AND column_name = 'post_closure_enabled_at'
      ) as exists;
    `);

    if (!column3Check[0].exists) {
      // Add the post_closure_enabled_at column
      await queryRunner.query(`
        ALTER TABLE "works" 
        ADD COLUMN "post_closure_enabled_at" TIMESTAMP NULL;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint first
    await queryRunner.query(`
      ALTER TABLE "works" 
      DROP CONSTRAINT IF EXISTS "FK_works_post_closure_enabled_by";
    `);
    
    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "works" 
      DROP COLUMN IF EXISTS "post_closure_enabled_at";
    `);
    
    await queryRunner.query(`
      ALTER TABLE "works" 
      DROP COLUMN IF EXISTS "post_closure_enabled_by_id";
    `);
    
    await queryRunner.query(`
      ALTER TABLE "works" 
      DROP COLUMN IF EXISTS "allow_post_closure_expenses";
    `);
  }
}

