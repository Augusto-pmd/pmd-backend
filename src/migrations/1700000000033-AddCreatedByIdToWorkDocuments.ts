import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreatedByIdToWorkDocuments1700000000033 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add created_by_id column to work_documents table if it doesn't exist
    const workDocumentsTable = await queryRunner.getTable('work_documents');
    if (workDocumentsTable) {
      const createdByIdColumn = workDocumentsTable.findColumnByName('created_by_id');
      if (!createdByIdColumn) {
        await queryRunner.query(`
          ALTER TABLE "work_documents" 
          ADD COLUMN "created_by_id" uuid;
        `);

        // Add foreign key constraint
        await queryRunner.query(`
          ALTER TABLE "work_documents" 
          ADD CONSTRAINT "FK_work_documents_created_by" 
          FOREIGN KEY ("created_by_id") 
          REFERENCES "users"("id") 
          ON DELETE SET NULL 
          ON UPDATE CASCADE;
        `);

        // Create index for better query performance
        await queryRunner.query(`
          CREATE INDEX "IDX_work_documents_created_by_id" 
          ON "work_documents"("created_by_id") 
          WHERE "created_by_id" IS NOT NULL;
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove created_by_id column from work_documents table
    const workDocumentsTable = await queryRunner.getTable('work_documents');
    if (workDocumentsTable) {
      const createdByIdColumn = workDocumentsTable.findColumnByName('created_by_id');
      if (createdByIdColumn) {
        // Drop index first
        await queryRunner.query(`
          DROP INDEX IF EXISTS "IDX_work_documents_created_by_id";
        `);

        // Drop foreign key constraint
        await queryRunner.query(`
          ALTER TABLE "work_documents" 
          DROP CONSTRAINT IF EXISTS "FK_work_documents_created_by";
        `);

        // Drop column
        await queryRunner.query(`
          ALTER TABLE "work_documents" 
          DROP COLUMN IF EXISTS "created_by_id";
        `);
      }
    }
  }
}

