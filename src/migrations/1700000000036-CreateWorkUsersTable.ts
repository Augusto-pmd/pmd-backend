import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkUsersTable1700000000036 implements MigrationInterface {
  name = 'CreateWorkUsersTable1700000000036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "work_users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "work_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" character varying(255),
        "assigned_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_work_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_work_users_work_user" UNIQUE ("work_id", "user_id"),
        CONSTRAINT "FK_work_users_work" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_work_users_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_work_users_work_id" ON "work_users"("work_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_work_users_user_id" ON "work_users"("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_work_users_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_work_users_work_id"`);
    await queryRunner.query(`DROP TABLE "work_users"`);
  }
}

