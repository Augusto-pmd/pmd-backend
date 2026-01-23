import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmployeesAndAttendancePermissionsToRoles1700000000047 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Definir los permisos adicionales por rol
    const rolePermissions = {
      direction: {
        employees: ['create', 'read', 'update', 'delete', 'manage'],
        attendance: ['create', 'read', 'update', 'delete', 'manage'],
      },
      supervisor: {
        employees: ['read'],
        attendance: ['read', 'create', 'update'],
      },
      administration: {
        employees: ['create', 'read', 'update', 'delete', 'manage'],
        attendance: ['create', 'read', 'update', 'delete', 'manage'],
      },
      operator: {
        employees: ['read'],
        attendance: ['read', 'create'],
      },
    };

    // Actualizar cada rol
    for (const [roleName, newPermissions] of Object.entries(rolePermissions)) {
      // Obtener el rol existente
      const existingRole = await queryRunner.query(
        `SELECT id, permissions FROM roles WHERE name = $1`,
        [roleName]
      );

      if (existingRole && existingRole.length > 0) {
        const role = existingRole[0];
        let currentPermissions: Record<string, string[]> = {};

        // Parsear permisos existentes
        if (role.permissions) {
          if (typeof role.permissions === 'string') {
            try {
              currentPermissions = JSON.parse(role.permissions);
            } catch (e) {
              console.warn(`Failed to parse permissions for role ${roleName}:`, e);
              currentPermissions = {};
            }
          } else if (typeof role.permissions === 'object') {
            currentPermissions = role.permissions as Record<string, string[]>;
          }
        }

        // Fusionar permisos nuevos con existentes (sin sobrescribir si ya existen)
        const mergedPermissions: Record<string, string[]> = {
          ...currentPermissions,
          ...newPermissions, // Los nuevos permisos tienen prioridad
        };

        // Para Administration: asegurar que NO tenga users ni audit
        if (roleName === 'administration') {
          delete mergedPermissions.users;
          delete mergedPermissions.audit;
        }

        // Actualizar el rol con los nuevos permisos
        const permissionsJson = JSON.stringify(mergedPermissions);
        await queryRunner.query(
          `UPDATE roles 
           SET permissions = CAST($1 AS jsonb), updated_at = NOW()
           WHERE name = $2`,
          [permissionsJson, roleName]
        );

        console.log(`✅ Permisos de employees y attendance agregados al rol: ${roleName}`);
      } else {
        console.warn(`⚠️ Rol ${roleName} no encontrado, se omite la actualización`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover los permisos de employees y attendance de cada rol
    const roleNames = ['direction', 'supervisor', 'administration', 'operator'];

    for (const roleName of roleNames) {
      const existingRole = await queryRunner.query(
        `SELECT id, permissions FROM roles WHERE name = $1`,
        [roleName]
      );

      if (existingRole && existingRole.length > 0) {
        const role = existingRole[0];
        let currentPermissions: Record<string, string[]> = {};

        // Parsear permisos existentes
        if (role.permissions) {
          if (typeof role.permissions === 'string') {
            try {
              currentPermissions = JSON.parse(role.permissions);
            } catch (e) {
              console.warn(`Failed to parse permissions for role ${roleName}:`, e);
              currentPermissions = {};
            }
          } else if (typeof role.permissions === 'object') {
            currentPermissions = role.permissions as Record<string, string[]>;
          }
        }

        // Remover permisos de employees y attendance
        delete currentPermissions.employees;
        delete currentPermissions.attendance;

        // Actualizar el rol sin los permisos de employees y attendance
        const permissionsJson = JSON.stringify(currentPermissions);
        await queryRunner.query(
          `UPDATE roles 
           SET permissions = CAST($1 AS jsonb), updated_at = NOW()
           WHERE name = $2`,
          [permissionsJson, roleName]
        );

        console.log(`✅ Permisos de employees y attendance removidos del rol: ${roleName}`);
      }
    }
  }
}
