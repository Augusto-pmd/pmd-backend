import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrganizationIdToUsersAndRenameColumns1700000000018 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create organizations table if it doesn't exist
    const orgTableExists = await queryRunner.hasTable('organizations');
    if (!orgTableExists) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "organizations" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "name" varchar(255) NOT NULL,
          "description" text,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_organizations" PRIMARY KEY ("id")
        );
      `);
    }

    // 2. Add organization_id to users if it doesn't exist
    const usersTable = await queryRunner.getTable('users');
    if (usersTable) {
      const orgIdColumn = usersTable.findColumnByName('organization_id');
      if (!orgIdColumn) {
        await queryRunner.query(`
          ALTER TABLE "users" 
          ADD COLUMN "organization_id" uuid;
        `);
        
        // Add foreign key constraint
        await queryRunner.query(`
          ALTER TABLE "users"
          ADD CONSTRAINT "FK_users_organization" 
          FOREIGN KEY ("organization_id") 
          REFERENCES "organizations"("id") 
          ON DELETE SET NULL 
          ON UPDATE CASCADE;
        `);

        // Create index on organization_id
        await queryRunner.query(`
          CREATE INDEX "IDX_users_organization_id" ON "users"("organization_id") 
          WHERE "organization_id" IS NOT NULL;
        `);
      }

      // 3. Handle name -> fullName column rename or creation
      const fullNameColumn = usersTable.findColumnByName('fullName');
      const nameColumn = usersTable.findColumnByName('name');
      
      if (!fullNameColumn && nameColumn) {
        // Rename name to fullName
        await queryRunner.query(`
          ALTER TABLE "users" 
          RENAME COLUMN "name" TO "fullName";
        `);
      } else if (!fullNameColumn && !nameColumn) {
        // Create fullName if neither exists
        await queryRunner.query(`
          ALTER TABLE "users" 
          ADD COLUMN "fullName" varchar(255);
        `);
      }

      // 4. Handle is_active -> isActive column rename or creation
      const isActiveColumn = usersTable.findColumnByName('isActive');
      const isActiveSnakeColumn = usersTable.findColumnByName('is_active');
      
      if (!isActiveColumn && isActiveSnakeColumn) {
        // Rename is_active to isActive
        await queryRunner.query(`
          ALTER TABLE "users" 
          RENAME COLUMN "is_active" TO "isActive";
        `);
      } else if (!isActiveColumn && !isActiveSnakeColumn) {
        // Create isActive if neither exists
        await queryRunner.query(`
          ALTER TABLE "users" 
          ADD COLUMN "isActive" boolean NOT NULL DEFAULT true;
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    
    if (usersTable) {
      // Reverse fullName -> name if fullName exists
      const fullNameColumn = usersTable.findColumnByName('fullName');
      const nameColumn = usersTable.findColumnByName('name');
      
      if (fullNameColumn && !nameColumn) {
        await queryRunner.query(`
          ALTER TABLE "users" 
          RENAME COLUMN "fullName" TO "name";
        `);
      } else if (fullNameColumn && nameColumn) {
        // If both exist, drop fullName
        await queryRunner.query(`
          ALTER TABLE "users" 
          DROP COLUMN "fullName";
        `);
      }

      // Reverse isActive -> is_active if isActive exists
      const isActiveColumn = usersTable.findColumnByName('isActive');
      const isActiveSnakeColumn = usersTable.findColumnByName('is_active');
      
      if (isActiveColumn && !isActiveSnakeColumn) {
        await queryRunner.query(`
          ALTER TABLE "users" 
          RENAME COLUMN "isActive" TO "is_active";
        `);
      } else if (isActiveColumn && isActiveSnakeColumn) {
        // If both exist, drop isActive
        await queryRunner.query(`
          ALTER TABLE "users" 
          DROP COLUMN "isActive";
        `);
      }

      // Drop organization_id column and related constraints
      const orgIdColumn = usersTable.findColumnByName('organization_id');
      if (orgIdColumn) {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_organization_id"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_organization"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "organization_id"`);
      }
    }
  }
}
