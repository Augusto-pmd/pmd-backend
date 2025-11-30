import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../roles/roles.entity';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('seed-default')
export class SeedDefaultController {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepo: Repository<Role>,
  ) {}

  @Get()
  async seedDefaults() {
    const rolesToCreate = [
      { name: UserRole.DIRECTION,        description: 'Dirección general', permissions: {} },
      { name: UserRole.SUPERVISOR,       description: 'Supervisor de obra', permissions: {} },
      { name: UserRole.ADMINISTRATION,   description: 'Administración del sistema', permissions: {} },
      { name: UserRole.OPERATOR,         description: 'Operador interno', permissions: {} },
    ];

    const created = [];

    for (const r of rolesToCreate) {
      const exists = await this.rolesRepo.findOne({ where: { name: r.name } });

      if (!exists) {
        const newRole = this.rolesRepo.create(r);
        await this.rolesRepo.save(newRole);
        created.push(r.name);
      }
    }

    return {
      message: 'Roles seeded successfully',
      created,
      total: rolesToCreate.length,
    };
  }
}
