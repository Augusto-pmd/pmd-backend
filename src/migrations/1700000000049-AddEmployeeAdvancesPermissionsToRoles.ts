import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmployeeAdvancesPermissionsToRoles1700000000049 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const rolePermissions: Record<string, Record<string, string[]>> = {
      direction: {
        employee_advances: ['create', 'read', 'update', 'delete', 'manage'],
      },
      supervisor: {
        employee_advances: ['read', 'create', 'update'],
      },
      administration: {
        employee_advances: ['create', 'read', 'update', 'delete', 'manage'],
      },
      operator: {
        employee_advances: ['read', 'create'],
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

      delete currentPermissions.employee_advances;

      await queryRunner.query(
        `UPDATE roles SET permissions = CAST($1 AS jsonb), updated_at = NOW() WHERE name = $2`,
        [JSON.stringify(currentPermissions), roleName],
      );
    }
  }
}

