import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedRoles1700000000039 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Definir los roles con sus permisos
    const roles = [
      {
        name: 'direction',
        description: 'Rol de dirección con acceso completo al sistema y permisos de sobrescritura',
        permissions: {
          dashboard: ['read'],
          users: ['create', 'read', 'update', 'delete', 'manage'],
          roles: ['create', 'read', 'update', 'delete', 'manage'],
          works: ['create', 'read', 'update', 'delete', 'manage'],
          expenses: ['create', 'read', 'update', 'delete', 'validate', 'manage'],
          suppliers: ['create', 'read', 'update', 'delete', 'approve', 'reject', 'manage'],
          contracts: ['create', 'read', 'update', 'delete', 'manage'],
          cashboxes: ['create', 'read', 'update', 'delete', 'close', 'approve', 'manage'],
          accounting: ['create', 'read', 'update', 'delete', 'close', 'reopen', 'manage'],
          incomes: ['create', 'read', 'update', 'delete', 'manage'],
          documents: ['create', 'read', 'update', 'delete', 'manage'],
          alerts: ['create', 'read', 'update', 'delete', 'manage'],
          audit: ['read', 'delete', 'manage'],
          reports: ['read'],
          settings: ['read', 'update', 'manage'],
          schedule: ['create', 'read', 'update', 'delete', 'manage'],
        },
      },
      {
        name: 'supervisor',
        description: 'Rol de supervisión de obras y gestión de cronogramas',
        permissions: {
          dashboard: ['read'],
          works: ['create', 'read', 'update'],
          expenses: ['read'],
          suppliers: ['read'],
          contracts: ['read'],
          cashboxes: ['read'],
          incomes: ['read'],
          documents: ['read'],
          alerts: ['read'],
          reports: ['read'],
          schedule: ['read', 'update'],
        },
      },
      {
        name: 'administration',
        description: 'Rol de administración con permisos de validación y aprobación',
        permissions: {
          dashboard: ['read'],
          works: ['create', 'read'],
          expenses: ['read', 'validate'],
          suppliers: ['read', 'approve', 'reject'],
          contracts: ['create', 'read', 'update'],
          cashboxes: ['read', 'approve'],
          accounting: ['create', 'read', 'update', 'close'],
          incomes: ['read', 'create'],
          documents: ['read', 'create', 'update'],
          alerts: ['read', 'create', 'update'],
          reports: ['read'],
          settings: ['read'],
          schedule: ['read'],
        },
      },
      {
        name: 'operator',
        description: 'Rol de operador con acceso limitado a recursos propios',
        permissions: {
          dashboard: ['read'],
          works: ['read'],
          expenses: ['create', 'read'],
          suppliers: ['create', 'read'],
          cashboxes: ['create', 'read', 'close'],
          documents: ['read', 'create'],
          alerts: ['read'],
          schedule: ['read'],
        },
      },
    ];

    // Insertar o actualizar cada rol
    for (const roleData of roles) {
      const permissionsJson = JSON.stringify(roleData.permissions);
      
      // Verificar si el rol existe
      const existingRole = await queryRunner.query(`
        SELECT id FROM roles WHERE name = $1
      `, [roleData.name]);

      if (existingRole && existingRole.length > 0) {
        // Para Administration: asegurar que NO tenga users ni audit en permisos
        // Esta es una corrección específica según el seed original
        let finalPermissionsJson = permissionsJson;
        if (roleData.name === 'administration') {
          const permissionsObj = roleData.permissions as Record<string, string[]>;
          // Asegurar que no tenga users ni audit
          const cleanedPermissions = { ...permissionsObj };
          delete cleanedPermissions.users;
          delete cleanedPermissions.audit;
          finalPermissionsJson = JSON.stringify(cleanedPermissions);
        }
        
        // Actualizar el rol existente
        // Usar CAST explícito para convertir el string JSON a JSONB
        await queryRunner.query(`
          UPDATE roles 
          SET 
            description = $1,
            permissions = CAST($2 AS jsonb),
            updated_at = NOW()
          WHERE name = $3
        `, [roleData.description, finalPermissionsJson, roleData.name]);
      } else {
        // Para Administration: asegurar que NO tenga users ni audit desde el inicio
        let finalPermissionsJson = permissionsJson;
        if (roleData.name === 'administration') {
          const permissionsObj = roleData.permissions as Record<string, string[]>;
          // Asegurar que no tenga users ni audit
          const cleanedPermissions = { ...permissionsObj };
          delete cleanedPermissions.users;
          delete cleanedPermissions.audit;
          finalPermissionsJson = JSON.stringify(cleanedPermissions);
        }
        
        // Crear el rol nuevo
        await queryRunner.query(`
          INSERT INTO roles (name, description, permissions, created_at, updated_at)
          VALUES ($1, $2, CAST($3 AS jsonb), NOW(), NOW())
        `, [roleData.name, roleData.description, finalPermissionsJson]);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Verificar si hay usuarios asignados a estos roles antes de eliminarlos
    const directionUsers = await queryRunner.query(`
      SELECT COUNT(*) as count FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'direction'
    `);

    const supervisorUsers = await queryRunner.query(`
      SELECT COUNT(*) as count FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'supervisor'
    `);

    const administrationUsers = await queryRunner.query(`
      SELECT COUNT(*) as count FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'administration'
    `);

    const operatorUsers = await queryRunner.query(`
      SELECT COUNT(*) as count FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'operator'
    `);

    // Solo eliminar roles si no tienen usuarios asignados
    if (directionUsers[0]?.count === '0' || !directionUsers[0]?.count) {
      await queryRunner.query(`DELETE FROM roles WHERE name = 'direction'`);
    }
    if (supervisorUsers[0]?.count === '0' || !supervisorUsers[0]?.count) {
      await queryRunner.query(`DELETE FROM roles WHERE name = 'supervisor'`);
    }
    if (administrationUsers[0]?.count === '0' || !administrationUsers[0]?.count) {
      await queryRunner.query(`DELETE FROM roles WHERE name = 'administration'`);
    }
    if (operatorUsers[0]?.count === '0' || !operatorUsers[0]?.count) {
      await queryRunner.query(`DELETE FROM roles WHERE name = 'operator'`);
    }
  }
}
