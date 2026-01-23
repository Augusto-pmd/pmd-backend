import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmployeeForeignKeyToAttendance1700000000046 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if employees table exists before adding foreign key
    const employeesTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'employees'
      );
    `);

    if (employeesTableExists[0]?.exists) {
      // Add foreign key constraint to employees table
      await queryRunner.query(`
        ALTER TABLE "attendance" 
        ADD CONSTRAINT "FK_attendance_employee" 
        FOREIGN KEY ("employee_id") 
        REFERENCES "employees"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      `);
    } else {
      // If employees table doesn't exist, log a warning
      console.warn(
        '⚠️  Employees table does not exist. Foreign key constraint will be added when employees table is created.'
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "attendance" 
      DROP CONSTRAINT IF EXISTS "FK_attendance_employee";
    `);
  }
}
