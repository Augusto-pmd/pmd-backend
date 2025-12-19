import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrganizationIdToWorksAndSuppliers1700000000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create organizations table if it doesn't exist
    const orgTableExists = await queryRunner.hasTable('organizations');
    if (!orgTableExists) {
      await queryRunner.query(`
        CREATE TABLE "organizations" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "name" varchar(255) NOT NULL,
          "description" text,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_organizations" PRIMARY KEY ("id")
        );
      `);
    }

    // Add organization_id to works table
    await queryRunner.query(`
      ALTER TABLE "works" 
      ADD COLUMN "organization_id" uuid;
    `);

    // Add foreign key constraint for works.organization_id
    await queryRunner.query(`
      ALTER TABLE "works"
      ADD CONSTRAINT "FK_works_organization" 
      FOREIGN KEY ("organization_id") 
      REFERENCES "organizations"("id") 
      ON DELETE SET NULL 
      ON UPDATE CASCADE;
    `);

    // Create index on works.organization_id
    await queryRunner.query(`
      CREATE INDEX "IDX_works_organization_id" ON "works"("organization_id");
    `);

    // Add organization_id to suppliers table
    await queryRunner.query(`
      ALTER TABLE "suppliers" 
      ADD COLUMN "organization_id" uuid;
    `);

    // Add foreign key constraint for suppliers.organization_id
    await queryRunner.query(`
      ALTER TABLE "suppliers"
      ADD CONSTRAINT "FK_suppliers_organization" 
      FOREIGN KEY ("organization_id") 
      REFERENCES "organizations"("id") 
      ON DELETE SET NULL 
      ON UPDATE CASCADE;
    `);

    // Create index on suppliers.organization_id
    await queryRunner.query(`
      CREATE INDEX "IDX_suppliers_organization_id" ON "suppliers"("organization_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_suppliers_organization_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_works_organization_id"`);

    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "suppliers" DROP CONSTRAINT IF EXISTS "FK_suppliers_organization"`);
    await queryRunner.query(`ALTER TABLE "works" DROP CONSTRAINT IF EXISTS "FK_works_organization"`);

    // Drop columns
    await queryRunner.query(`ALTER TABLE "suppliers" DROP COLUMN IF EXISTS "organization_id"`);
    await queryRunner.query(`ALTER TABLE "works" DROP COLUMN IF EXISTS "organization_id"`);
  }
}
