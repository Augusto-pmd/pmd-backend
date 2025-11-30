import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { Role } from '../roles/role.entity';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('seed-admin')
export class SeedAdminController {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(Role)
    private rolesRepo: Repository<Role>,
  ) {}

  @Get()
  async run() {
    const adminRole = await this.rolesRepo.findOne({
      where: { name: UserRole.ADMINISTRATION },
    });

    if (!adminRole) {
      return {
        message: 'ERROR: ADMINISTRATION role not found. Run /seed-default first.',
      };
    }

    const existing = await this.usersRepo.findOne({
      where: { email: 'admin@pmd.com' },
    });

    if (existing) {
      return { message: 'Admin already exists' };
    }

    const hashed = await bcrypt.hash('Pmd2024DB', 10);

    const admin = this.usersRepo.create({
      email: 'admin@pmd.com',
      fullName: 'Administrador PMD',
      password: hashed,
      isActive: true,
      role: adminRole,
    });

    await this.usersRepo.save(admin);

    return {
      message: 'Admin created successfully',
      email: 'admin@pmd.com',
      password: 'Pmd2024DB',
    };
  }
}

