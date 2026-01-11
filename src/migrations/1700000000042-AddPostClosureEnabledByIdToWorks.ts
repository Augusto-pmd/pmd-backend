import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add post_closure_enabled_by_id column to works table
 * 
 * This migration is idempotent and checks if the column exists before adding it.
 * If the column already exists, the migration will not fail.
 */
export class AddPostClosureEnabledByIdToWorks1700000000042 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if works table exists
    const worksTable = await queryRunner.getTable('works');
    
    if (worksTable) {
      // Check if post_closure_enabled_by_id column already exists
      const columnExists = worksTable.findColumnByName('post_closure_enabled_by_id');
      
      if (!columnExists) {
        // Add the post_closure_enabled_by_id column
        await queryRunner.query(`
          ALTER TABLE "works" 
          ADD COLUMN "post_closure_enabled_by_id" uuid NULL;
        `);

        // Check if foreign key constraint already exists before adding it
        const constraintExists = await queryRunner.query(`
          SELECT EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public'
            AND table_name = 'works' 
            AND constraint_name = 'FK_works_post_closure_enabled_by'
          ) as exists;
        `);

        if (!constraintExists[0].exists) {
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
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if works table exists
    const worksTable = await queryRunner.getTable('works');
    
    if (worksTable) {
      // Check if column exists before dropping
      const columnExists = worksTable.findColumnByName('post_closure_enabled_by_id');
      
      if (columnExists) {
        // Drop foreign key constraint first
        await queryRunner.query(`
          ALTER TABLE "works" 
          DROP CONSTRAINT IF EXISTS "FK_works_post_closure_enabled_by";
        `);
        
        // Drop the column
        await queryRunner.query(`
          ALTER TABLE "works" 
          DROP COLUMN IF EXISTS "post_closure_enabled_by_id";
        `);
      }
    }
  }
}
