import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContractIdToExpenses1700000000019 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const expensesTable = await queryRunner.getTable('expenses');
    const hasContractId = expensesTable?.findColumnByName('contract_id');

    if (!hasContractId) {
      // Add contract_id column
      await queryRunner.query(`
        ALTER TABLE "expenses"
        ADD COLUMN "contract_id" uuid;
      `);

      // Add foreign key constraint
      await queryRunner.query(`
        ALTER TABLE "expenses"
        ADD CONSTRAINT "FK_expenses_contract"
        FOREIGN KEY ("contract_id")
        REFERENCES "contracts"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
      `);

      // Add index for better query performance
      await queryRunner.query(`
        CREATE INDEX "IDX_expenses_contract_id"
        ON "expenses"("contract_id");
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_expenses_contract_id"`);

    // Drop foreign key constraint
    await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "FK_expenses_contract"`);

    // Drop column
    await queryRunner.query(`ALTER TABLE "expenses" DROP COLUMN IF EXISTS "contract_id"`);
  }
}

