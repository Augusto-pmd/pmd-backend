import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../roles/role.entity';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('seed-default')
export class SeedDefaultController {
  constructor(
    @InjectRepository(Role)
    private rolesRepo: Repository<Role>,
  ) {}

  @Get()
  async run() {
    const baseRoles = [
      { name: UserRole.DIRECTION, description: 'Dirección general' },
      { name: UserRole.SUPERVISOR, description: 'Supervisor de obra' },
      { name: UserRole.ADMINISTRATION, description: 'Administración' },
      { name: UserRole.OPERATOR, description: 'Operador interno' },
    ];

    const created = [];

    for (const r of baseRoles) {
      const exists = await this.rolesRepo.findOne({ where: { name: r.name } });
      if (!exists) {
        const role = this.rolesRepo.create({
          name: r.name,
          description: r.description,
          permissions: {},
        });
        await this.rolesRepo.save(role);
        created.push(r.name);
      }
    }

    return {
      message: 'Roles seeded successfully',
      created,
    };
  }
}
