import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentIdToAlertsAndCreateWorkDocuments1700000000016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create work_document_type_enum if it doesn't exist
    try {
      await queryRunner.query(`
        CREATE TYPE "work_document_type_enum" AS ENUM (
          'contract',
          'plan',
          'permit',
          'invoice',
          'receipt',
          'other'
        );
      `);
    } catch (error: any) {
      // Type already exists, ignore error
      if (error.code !== '42P07') {
        throw error;
      }
    }

    // Create work_document_status_enum if it doesn't exist
    try {
      await queryRunner.query(`
        CREATE TYPE "work_document_status_enum" AS ENUM (
          'draft',
          'pending',
          'approved',
          'rejected'
        );
      `);
    } catch (error: any) {
      // Type already exists, ignore error
      if (error.code !== '42P07') {
        throw error;
      }
    }

    // Add document_id column to alerts table if it doesn't exist
    const alertsTable = await queryRunner.getTable('alerts');
    if (alertsTable) {
      const documentIdColumn = alertsTable.findColumnByName('document_id');
      if (!documentIdColumn) {
        await queryRunner.query(`
          ALTER TABLE "alerts" 
          ADD COLUMN "document_id" uuid;
        `);
      }
    }

    // Create work_documents table if it doesn't exist
    const workDocumentsTableExists = await queryRunner.hasTable('work_documents');
    if (!workDocumentsTableExists) {
      await queryRunner.query(`
        CREATE TABLE "work_documents" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "work_id" uuid NOT NULL,
          "file_url" varchar(500) NOT NULL,
          "type" "work_document_type_enum" NOT NULL,
          "status" "work_document_status_enum" NOT NULL DEFAULT 'draft',
          "version" varchar(50),
          "notes" text,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_work_documents" PRIMARY KEY ("id"),
          CONSTRAINT "FK_work_documents_work" FOREIGN KEY ("work_id") 
            REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);

      // Create indexes on work_documents
      await queryRunner.query(`
        CREATE INDEX "IDX_work_documents_work_id" ON "work_documents"("work_id");
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_work_documents_type" ON "work_documents"("type");
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_work_documents_status" ON "work_documents"("status");
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop work_documents table
    await queryRunner.query(`DROP TABLE IF EXISTS "work_documents"`);

    // Drop document_id column from alerts
    const alertsTable = await queryRunner.getTable('alerts');
    if (alertsTable) {
      const documentIdColumn = alertsTable.findColumnByName('document_id');
      if (documentIdColumn) {
        await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN IF EXISTS "document_id"`);
      }
    }

    // Drop enums (only if they exist and are not used by other tables)
    await queryRunner.query(`DROP TYPE IF EXISTS "work_document_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "work_document_type_enum"`);
  }
}
