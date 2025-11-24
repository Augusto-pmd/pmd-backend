import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCashboxUniqueConstraint1700000000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add unique constraint: one open cashbox per user at a time
    // This ensures business rule: "One open cashbox per user at a time"
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_cashboxes_user_open" 
      ON "cashboxes"("user_id") 
      WHERE "status" = 'open';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cashboxes_user_open"`);
  }
}

