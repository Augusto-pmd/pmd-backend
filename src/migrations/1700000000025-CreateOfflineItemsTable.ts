import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOfflineItemsTable1700000000025 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create offline_items table
    await queryRunner.query(`
      CREATE TABLE "offline_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "item_type" varchar(100) NOT NULL,
        "data" jsonb NOT NULL,
        "user_id" uuid NOT NULL,
        "is_synced" boolean NOT NULL DEFAULT false,
        "synced_at" TIMESTAMP NULL,
        "error_message" text NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_offline_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_offline_items_user" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_offline_items_user_id" ON "offline_items"("user_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_offline_items_is_synced" ON "offline_items"("is_synced");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_offline_items_item_type" ON "offline_items"("item_type");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_offline_items_created_at" ON "offline_items"("created_at" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_offline_items_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_offline_items_item_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_offline_items_is_synced"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_offline_items_user_id"`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "offline_items"`);
  }
}

