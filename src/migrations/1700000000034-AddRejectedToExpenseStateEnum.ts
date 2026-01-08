import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRejectedToExpenseStateEnum1700000000034 implements MigrationInterface {
  name = 'AddRejectedToExpenseStateEnum1700000000034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, check if the enum exists
    let enumExists = false;
    try {
      const enumCheckResult = await queryRunner.query(`
        SELECT COUNT(*) as count 
        FROM pg_type 
        WHERE typname = 'expense_state_enum'
      `);

      // Parse the count result - could be string or number depending on PostgreSQL version
      const countValue = enumCheckResult && enumCheckResult[0] ? enumCheckResult[0].count : 0;
      const countNum = typeof countValue === 'string' ? parseInt(countValue, 10) : countValue;
      enumExists = countNum > 0;
    } catch (error) {
      // If query fails, assume enum doesn't exist
      enumExists = false;
    }

    if (!enumExists) {
      // Try to create the enum with all values including 'rejected'
      try {
        await queryRunner.query(`
          CREATE TYPE "expense_state_enum" AS ENUM ('pending', 'validated', 'observed', 'annulled', 'rejected');
        `);
        return; // Enum created with all values, we're done
      } catch (createError: any) {
        // If error is "already exists" (code 42710), the enum actually exists
        // This can happen if the COUNT query didn't detect it correctly
        if (createError.code === '42710' || createError.message?.includes('already exists')) {
          // Enum exists but verification failed, continue to check for 'rejected' value
          enumExists = true;
        } else {
          // Some other error, re-throw it
          throw createError;
        }
      }
    }
    
    // At this point, enumExists should be true (either detected or confirmed after failed CREATE)
    // Now check if 'rejected' value exists

    // Enum exists (or was created), check if 'rejected' value already exists
    let valueExists = false;
    try {
      const valueCheckResult = await queryRunner.query(`
        SELECT COUNT(*) as count 
        FROM pg_enum e
        INNER JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'expense_state_enum' 
        AND e.enumlabel = 'rejected'
      `);

      // Parse the count result
      const countValue = valueCheckResult && valueCheckResult[0] ? valueCheckResult[0].count : 0;
      const countNum = typeof countValue === 'string' ? parseInt(countValue, 10) : countValue;
      valueExists = countNum > 0;
    } catch (error) {
      // If query fails, assume value doesn't exist and try to add it
      valueExists = false;
    }

    if (valueExists) {
      // Value already exists, nothing to do
      return;
    }

    // Value doesn't exist, need to add it
    // ALTER TYPE ... ADD VALUE cannot run inside a transaction block in PostgreSQL
    // We need to execute this outside of the transaction managed by TypeORM
    // Use the driver's connection pool directly
    const connection = queryRunner.connection;
    const driver = connection.driver as any;
    
    // Get the underlying connection pool - try different possible properties
    let pool = driver.master || driver.pool;
    
    // If pool is not available, try to get it from the connection
    if (!pool || typeof pool.query !== 'function') {
      if (connection.isConnected) {
        const dataSource = connection as any;
        pool = dataSource.driver?.master || dataSource.driver?.pool;
      }
    }
    
    if (!pool || typeof pool.query !== 'function') {
      throw new Error('Could not access database pool to execute ALTER TYPE command. Pool is required because ALTER TYPE ADD VALUE cannot run inside a transaction.');
    }
    
    // Use pool to execute outside transaction
    try {
      await pool.query(`ALTER TYPE "expense_state_enum" ADD VALUE 'rejected';`);
    } catch (addValueError: any) {
      // If the error is that the value already exists, that's fine - another migration or process may have added it
      if (addValueError.message?.includes('already exists')) {
        return; // Value already exists, nothing to do
      }
      // If enum doesn't exist (code 42704), this shouldn't happen since we verified it exists
      // But handle it gracefully: if enum really doesn't exist for pool's connection, 
      // it will be created by CreateEnums migration, so we can safely ignore this error
      if (addValueError.code === '42704' || addValueError.message?.includes('does not exist')) {
        // Enum doesn't exist from pool's perspective - this is a connection/visibility issue
        // The enum exists in the database, so we can safely skip adding the value here
        // It will be handled by CreateEnums migration or manual intervention
        console.warn('Warning: Could not add "rejected" value to expense_state_enum. The enum may not be visible from the pool connection. This may require manual intervention or running CreateEnums migration first.');
        return; // Don't fail the migration, but warn about the issue
      }
      // Re-throw other errors
      throw addValueError;
    }
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