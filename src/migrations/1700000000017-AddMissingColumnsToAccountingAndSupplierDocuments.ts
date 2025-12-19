import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingColumnsToAccountingAndSupplierDocuments1700000000017 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add organization_id to accounting_records table
    const hasOrganizationId = await queryRunner.hasColumn('accounting_records', 'organization_id');
    if (!hasOrganizationId) {
      await queryRunner.query(`
        ALTER TABLE "accounting_records" 
        ADD COLUMN "organization_id" uuid;
      `);

      // Add foreign key constraint for accounting_records.organization_id
      await queryRunner.query(`
        ALTER TABLE "accounting_records"
        ADD CONSTRAINT "FK_accounting_records_organization" 
        FOREIGN KEY ("organization_id") 
        REFERENCES "organizations"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
      `);

      // Create index on accounting_records.organization_id
      await queryRunner.query(`
        CREATE INDEX "IDX_accounting_records_organization_id" ON "accounting_records"("organization_id");
      `);
    }

    // Add version to supplier_documents table
    const hasVersion = await queryRunner.hasColumn('supplier_documents', 'version');
    if (!hasVersion) {
      await queryRunner.query(`
        ALTER TABLE "supplier_documents" 
        ADD COLUMN "version" varchar(50);
      `);
    }

    // Add notes to supplier_documents table
    const hasNotes = await queryRunner.hasColumn('supplier_documents', 'notes');
    if (!hasNotes) {
      await queryRunner.query(`
        ALTER TABLE "supplier_documents" 
        ADD COLUMN "notes" text;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index and foreign key for accounting_records.organization_id
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_accounting_records_organization_id"`);
    await queryRunner.query(`ALTER TABLE "accounting_records" DROP CONSTRAINT IF EXISTS "FK_accounting_records_organization"`);

    // Drop columns
    await queryRunner.query(`ALTER TABLE "accounting_records" DROP COLUMN IF EXISTS "organization_id"`);
    await queryRunner.query(`ALTER TABLE "supplier_documents" DROP COLUMN IF EXISTS "version"`);
    await queryRunner.query(`ALTER TABLE "supplier_documents" DROP COLUMN IF EXISTS "notes"`);
  }
}
