import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedTestUsers1700000000040 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Hash de la contraseña "password123" - se calcula una vez para todos los usuarios
    const passwordHash = await bcrypt.hash('password123', 10);
    
    // Obtener la organización por defecto
    const defaultOrg = await queryRunner.query(`
      SELECT id FROM organizations 
      WHERE id = '00000000-0000-0000-0000-000000000001'
    `);

    if (!defaultOrg || defaultOrg.length === 0) {
      throw new Error('Organización por defecto no encontrada. Ejecuta primero la migración SeedDefaultOrganization.');
    }

    const organizationId = defaultOrg[0].id;

    // Definir los usuarios de prueba
    // NOTA: admin@pmd.com tiene updateExisting=true para forzar actualización de rol y contraseña
    // según el comportamiento del seed original
    const testUsers = [
      {
        email: 'direction@pmd.com',
        password: passwordHash,
        fullName: 'Usuario Direction',
        roleName: 'direction',
        updateExisting: false, // Solo actualizar si el rol es diferente
      },
      {
        email: 'supervisor@pmd.com',
        password: passwordHash,
        fullName: 'Usuario Supervisor',
        roleName: 'supervisor',
        updateExisting: false,
      },
      {
        email: 'admin@pmd.com',
        password: passwordHash,
        fullName: 'Usuario Administration',
        roleName: 'administration',
        updateExisting: true, // SIEMPRE actualizar rol y contraseña (para tests E2E)
      },
      {
        email: 'operator@pmd.com',
        password: passwordHash,
        fullName: 'Usuario Operator',
        roleName: 'operator',
        updateExisting: false,
      },
    ];

    // Insertar o actualizar cada usuario
    for (const user of testUsers) {
      // Obtener el ID del rol
      const role = await queryRunner.query(`
        SELECT id FROM roles WHERE name = $1
      `, [user.roleName]);

      if (!role || role.length === 0) {
        throw new Error(`Rol '${user.roleName}' no encontrado. Ejecuta primero la migración SeedRoles.`);
      }

      const roleId = role[0].id;

      // Verificar si el usuario ya existe
      const existingUser = await queryRunner.query(`
        SELECT id, role_id, "isActive", organization_id FROM users WHERE email = $1
      `, [user.email]);

      const updateExisting = (user as any).updateExisting === true;

      if (existingUser && existingUser.length > 0) {
        const existingRoleId = existingUser[0].role_id;
        const existingIsActive = existingUser[0].isActive;
        const existingOrgId = existingUser[0].organization_id;
        
        // Determinar si debemos actualizar:
        // 1. Si updateExisting=true, SIEMPRE actualizar rol y contraseña
        // 2. Si el rol es diferente, actualizar
        // 3. Si faltan campos (isActive=false o organization_id=null), actualizar
        const roleChanged = existingRoleId !== roleId;
        const needsUpdate = 
          updateExisting || 
          roleChanged || 
          !existingIsActive || 
          !existingOrgId || 
          existingOrgId !== organizationId;

        if (needsUpdate) {
          // Si updateExisting=true, forzar actualización de rol y contraseña
          // Si solo cambió el rol o faltan campos, actualizar normalmente
          await queryRunner.query(`
            UPDATE users 
            SET 
              "fullName" = $1,
              password = $2,
              role_id = $3,
              organization_id = $4,
              "isActive" = true,
              updated_at = NOW()
            WHERE email = $5
          `, [user.fullName, user.password, roleId, organizationId, user.email]);
        }
        // Si no necesita actualización, no hacer nada (igual que el seed original)
      } else {
        // Crear el usuario nuevo
        await queryRunner.query(`
          INSERT INTO users (
            email, 
            password, 
            "fullName", 
            role_id, 
            organization_id, 
            "isActive", 
            created_at, 
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
        `, [user.email, user.password, user.fullName, roleId, organizationId]);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar solo los usuarios de prueba creados por esta migración
    const testEmails = [
      'direction@pmd.com',
      'supervisor@pmd.com',
      'admin@pmd.com',
      'operator@pmd.com',
    ];

    for (const email of testEmails) {
      await queryRunner.query(`
        DELETE FROM users WHERE email = $1
      `, [email]);
    }
  }
}
