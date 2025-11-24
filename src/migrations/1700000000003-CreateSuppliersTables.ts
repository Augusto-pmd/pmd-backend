import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSuppliersTables1700000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create suppliers table
    await queryRunner.query(`
      CREATE TABLE "suppliers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "cuit" varchar(50) UNIQUE,
        "email" varchar(255),
        "phone" varchar(50),
        "category" varchar(255),
        "status" "supplier_status_enum" NOT NULL DEFAULT 'provisional',
        "address" text,
        "created_by_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_suppliers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_suppliers_created_by" FOREIGN KEY ("created_by_id") 
          REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // Create indexes on suppliers
    await queryRunner.query(`
      CREATE INDEX "IDX_suppliers_cuit" ON "suppliers"("cuit") WHERE "cuit" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_suppliers_status" ON "suppliers"("status");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_suppliers_created_by_id" ON "suppliers"("created_by_id");
    `);

    // Create supplier_documents table
    await queryRunner.query(`
      CREATE TABLE "supplier_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "supplier_id" uuid NOT NULL,
        "document_type" "supplier_document_type_enum" NOT NULL,
        "file_url" varchar(500),
        "document_number" varchar(255),
        "expiration_date" date,
        "is_valid" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_supplier_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_supplier_documents_supplier" FOREIGN KEY ("supplier_id") 
          REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Create indexes on supplier_documents
    await queryRunner.query(`
      CREATE INDEX "IDX_supplier_documents_supplier_id" ON "supplier_documents"("supplier_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_supplier_documents_document_type" ON "supplier_documents"("document_type");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_supplier_documents_expiration_date" ON "supplier_documents"("expiration_date") WHERE "expiration_date" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "supplier_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "suppliers"`);
  }
}

