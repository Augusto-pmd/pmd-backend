import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPayrollRubric1700000000050 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rubro fijo para gastos de nómina (Expense.rubric_id es obligatorio)
    const RUBRIC_ID = '00000000-0000-0000-0000-000000000050';
    const CODE = 'PAYROLL';

    const existing = await queryRunner.query(
      `SELECT id FROM rubrics WHERE code = $1`,
      [CODE],
    );

    if (existing && existing.length > 0) {
      return;
    }

    await queryRunner.query(
      `
      INSERT INTO rubrics (id, name, description, code, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      `,
      [
        RUBRIC_ID,
        'Nómina',
        'Rubro para gastos de nómina/pagos semanales de empleados',
        CODE,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM rubrics WHERE code = $1`, ['PAYROLL']);
  }
}

