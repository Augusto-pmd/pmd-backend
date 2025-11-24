import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBaseTables1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create roles table
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" "user_role_enum" NOT NULL UNIQUE,
        "description" text,
        "permissions" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id")
      );
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "email" varchar(255) NOT NULL UNIQUE,
        "password" varchar(255) NOT NULL,
        "phone" varchar(50),
        "is_active" boolean NOT NULL DEFAULT true,
        "role_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "FK_users_role" FOREIGN KEY ("role_id") 
          REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);

    // Create index on users.email
    await queryRunner.query(`
      CREATE INDEX "IDX_users_email" ON "users"("email");
    `);

    // Create index on users.role_id
    await queryRunner.query(`
      CREATE INDEX "IDX_users_role_id" ON "users"("role_id");
    `);

    // Create rubrics table
    await queryRunner.query(`
      CREATE TABLE "rubrics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "description" text,
        "code" varchar(50),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rubrics" PRIMARY KEY ("id")
      );
    `);

    // Create index on rubrics.code
    await queryRunner.query(`
      CREATE INDEX "IDX_rubrics_code" ON "rubrics"("code") WHERE "code" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "rubrics"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
  }
}

