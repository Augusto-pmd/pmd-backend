import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPayrollPermissionsToRoles1700000000052 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const rolePermissions: Record<string, Record<string, string[]>> = {
      direction: {
        payroll: ['create', 'read', 'update', 'delete', 'manage'],
      },
      supervisor: {
        payroll: ['read'],
      },
      administration: {
        payroll: ['create', 'read', 'update', 'delete', 'manage'],
      },
      operator: {
        // Operador no accede a nómina en Fase 4 (solo RRHH/Administración/Supervisión)
      },
    };

    for (const [roleName, newPermissions] of Object.entries(rolePermissions)) {
      const existingRole = await queryRunner.query(
        `SELECT id, permissions FROM roles WHERE name = $1`,
        [roleName],
      );

      if (!existingRole || existingRole.length === 0) {
        continue;
      }

      const role = existingRole[0];
      let currentPermissions: Record<string, unknown> = {};

      if (role.permissions) {
        if (typeof role.permissions === 'string') {
          try {
            currentPermissions = JSON.parse(role.permissions);
          } catch {
            currentPermissions = {};
          }
        } else if (typeof role.permissions === 'object') {
          currentPermissions = role.permissions as Record<string, unknown>;
        }
      }

      const mergedPermissions: Record<string, unknown> = {
        ...currentPermissions,
        ...newPermissions,
      };

      // Para Administration: asegurar que NO tenga users ni audit
      if (roleName === 'administration') {
        delete mergedPermissions.users;
        delete mergedPermissions.audit;
      }

      await queryRunner.query(
        `UPDATE roles SET permissions = CAST($1 AS jsonb), updated_at = NOW() WHERE name = $2`,
        [JSON.stringify(mergedPermissions), roleName],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const roleNames = ['direction', 'supervisor', 'administration', 'operator'];

    for (const roleName of roleNames) {
      const existingRole = await queryRunner.query(
        `SELECT id, permissions FROM roles WHERE name = $1`,
        [roleName],
      );

      if (!existingRole || existingRole.length === 0) {
        continue;
      }

      const role = existingRole[0];
      let currentPermissions: Record<string, unknown> = {};

      if (role.permissions) {
        if (typeof role.permissions === 'string') {
          try {
            currentPermissions = JSON.parse(role.permissions);
          } catch {
            currentPermissions = {};
          }
        } else if (typeof role.permissions === 'object') {
          currentPermissions = role.permissions as Record<string, unknown>;
        }
      }

      delete currentPermissions.payroll;

      await queryRunner.query(
        `UPDATE roles SET permissions = CAST($1 AS jsonb), updated_at = NOW() WHERE name = $2`,
        [JSON.stringify(currentPermissions), roleName],
      );
    }
  }
}

