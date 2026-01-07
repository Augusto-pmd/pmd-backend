import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingAlertTypes1700000000035 implements MigrationInterface {
  name = 'AddMissingAlertTypes1700000000035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing alert type values to alert_type_enum
    // Note: ALTER TYPE ... ADD VALUE cannot run inside a transaction block in PostgreSQL
    // We need to execute this outside of the transaction managed by TypeORM
    const connection = queryRunner.connection;
    const driver = connection.driver as any;
    
    // Get the underlying connection pool
    const pool = driver.master || driver.pool;
    
    // List of alert types that might be missing
    const missingTypes = [
      'rejected_expense',
      'annulled_expense',
      'post_closure_expense',
      'missing_validation',
      'pending_income_confirmation',
    ];
    
    // Add each missing type if it doesn't exist
    for (const type of missingTypes) {
      try {
        await pool.query(`ALTER TYPE "alert_type_enum" ADD VALUE IF NOT EXISTS '${type}';`);
      } catch (error: any) {
        // If the value already exists, that's fine, continue
        if (error?.code !== '22P02' && !error?.message?.includes('already exists')) {
          console.warn(`Failed to add alert type '${type}':`, error.message);
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL does not support removing enum values directly
    // This would require recreating the enum type, which is complex and risky
    console.warn('Cannot remove enum values from alert_type_enum. Manual intervention required if needed.');
  }
}

