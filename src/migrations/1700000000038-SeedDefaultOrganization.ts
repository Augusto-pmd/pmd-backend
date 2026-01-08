import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDefaultOrganization1700000000038 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar si la organización por defecto ya existe
    const orgExists = await queryRunner.query(`
      SELECT id FROM organizations 
      WHERE id = '00000000-0000-0000-0000-000000000001'
    `);

    if (orgExists && orgExists.length > 0) {
      // Si existe, actualizar los datos por si acaso
      await queryRunner.query(`
        UPDATE organizations 
        SET 
          name = 'PMD Arquitectura',
          description = 'Organización por defecto PMD',
          updated_at = NOW()
        WHERE id = '00000000-0000-0000-0000-000000000001'
      `);
      return;
    }

    // Crear organización por defecto
    // Nota: Ya verificamos arriba si existe, así que intentamos insertar directamente
    // Si por alguna razón existe (race condition), simplemente no hacemos nada
    try {
      await queryRunner.query(`
        INSERT INTO organizations (id, name, description, created_at, updated_at)
        VALUES (
          '00000000-0000-0000-0000-000000000001',
          'PMD Arquitectura',
          'Organización por defecto PMD',
          NOW(),
          NOW()
        )
      `);
    } catch (insertError: any) {
      // Si el error es que el registro ya existe (código 23505 = unique_violation),
      // simplemente actualizamos en su lugar
      if (insertError.code === '23505' || insertError.message?.includes('duplicate key') || insertError.message?.includes('already exists')) {
        // Registro ya existe, actualizar en su lugar
        await queryRunner.query(`
          UPDATE organizations 
          SET 
            name = 'PMD Arquitectura',
            description = 'Organización por defecto PMD',
            updated_at = NOW()
          WHERE id = '00000000-0000-0000-0000-000000000001'
        `);
      } else {
        // Otro tipo de error, re-lanzarlo
        throw insertError;
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar la organización por defecto solo si no tiene relaciones
    // Primero verificamos si hay usuarios u otras entidades que la referencien
    const hasUsers = await queryRunner.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE organization_id = '00000000-0000-0000-0000-000000000001'
    `);

    const hasWorks = await queryRunner.query(`
      SELECT COUNT(*) as count FROM works 
      WHERE organization_id = '00000000-0000-0000-0000-000000000001'
    `);

    const hasSuppliers = await queryRunner.query(`
      SELECT COUNT(*) as count FROM suppliers 
      WHERE organization_id = '00000000-0000-0000-0000-000000000001'
    `);

    if (
      (hasUsers[0]?.count === '0' || !hasUsers[0]?.count) &&
      (hasWorks[0]?.count === '0' || !hasWorks[0]?.count) &&
      (hasSuppliers[0]?.count === '0' || !hasSuppliers[0]?.count)
    ) {
      await queryRunner.query(`
        DELETE FROM organizations 
        WHERE id = '00000000-0000-0000-0000-000000000001'
      `);
    }
  }
}
