import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNameToWorkDocuments1700000000032 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add name column to work_documents table if it doesn't exist
    const workDocumentsTable = await queryRunner.getTable('work_documents');
    if (workDocumentsTable) {
      const nameColumn = workDocumentsTable.findColumnByName('name');
      if (!nameColumn) {
        await queryRunner.query(`
          ALTER TABLE "work_documents" 
          ADD COLUMN "name" varchar(255);
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove name column from work_documents table
    const workDocumentsTable = await queryRunner.getTable('work_documents');
    if (workDocumentsTable) {
      const nameColumn = workDocumentsTable.findColumnByName('name');
      if (nameColumn) {
        await queryRunner.query(`
          ALTER TABLE "work_documents" 
          DROP COLUMN IF EXISTS "name";
        `);
      }
    }
  }
}

