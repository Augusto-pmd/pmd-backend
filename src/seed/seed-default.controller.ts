import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../roles/roles.entity';

@Controller('seed-default')
export class SeedDefaultController {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepo: Repository<Role>,
  ) {}

  @Get()
  async seedDefaults() {
    // Lista de roles base del sistema PMD
    const roles = [
      { name: 'superadmin', description: 'Acceso total al sistema' },
      { name: 'admin', description: 'Administrador general' },
      { name: 'works_manager', description: 'Gestión de obras' },
      { name: 'accounting', description: 'Administración y contabilidad' },
      { name: 'supplier', description: 'Proveedores' },
      { name: 'auditor', description: 'Auditor interno' },
      { name: 'staff', description: 'Usuario interno con permisos limitados' },
      { name: 'viewer', description: 'Solo lectura' },
    ];

    const created = [];

    for (const r of roles) {
      const exists = await this.rolesRepo.findOne({ where: { name: r.name as any } });

      if (!exists) {
        const newRole = this.rolesRepo.create(r as any);
        await this.rolesRepo.save(newRole);
        created.push(r.name);
      }
    }

    return {
      message: 'Default roles seeded',
      created,
      totalRoles: roles.length,
    };
  }
}

