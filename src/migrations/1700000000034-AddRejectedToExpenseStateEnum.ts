import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRejectedToExpenseStateEnum1700000000034 implements MigrationInterface {
  name = 'AddRejectedToExpenseStateEnum1700000000034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'rejected' value to expense_state_enum
    // Note: ALTER TYPE ... ADD VALUE cannot run inside a transaction block in PostgreSQL
    // We need to execute this outside of the transaction managed by TypeORM
    // Use the driver's connection pool directly
    const connection = queryRunner.connection;
    const driver = connection.driver as any;
    
    // Get the underlying connection pool
    const pool = driver.master || driver.pool;
    
    // Execute the ALTER TYPE command directly on the pool (outside transaction)
    await pool.query(`ALTER TYPE "expense_state_enum" ADD VALUE IF NOT EXISTS 'rejected';`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL does not support removing enum values directly
    // This would require recreating the enum type, which is complex and risky
    // For now, we'll leave it as a no-op
    // If you need to remove it, you would need to:
    // 1. Create a new enum without 'rejected'
    // 2. Update all columns to use the new enum
    // 3. Drop the old enum
    // 4. Rename the new enum to the old name
    console.warn('Cannot remove enum value "rejected" from expense_state_enum. Manual intervention required if needed.');
  }
}

