import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhoneToUsers1700000000041 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if users table exists
    const usersTable = await queryRunner.getTable('users');
    
    if (usersTable) {
      // Check if phone column already exists
      const phoneColumn = usersTable.findColumnByName('phone');
      
      if (!phoneColumn) {
        // Add phone column as nullable varchar
        await queryRunner.query(`
          ALTER TABLE "users" 
          ADD COLUMN "phone" varchar(255) NULL;
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if users table exists
    const usersTable = await queryRunner.getTable('users');
    
    if (usersTable) {
      // Check if phone column exists before dropping
      const phoneColumn = usersTable.findColumnByName('phone');
      
      if (phoneColumn) {
        await queryRunner.query(`
          ALTER TABLE "users" 
          DROP COLUMN IF EXISTS "phone";
        `);
      }
    }
  }
}
