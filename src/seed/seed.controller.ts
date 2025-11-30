import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { Role } from '../roles/roles.entity';
import { UserRole } from '../common/enums/user-role.enum';
import * as bcrypt from 'bcrypt';

@Controller('seed-admin')
export class SeedAdminController {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepo: Repository<Role>,
  ) {}

  @Get()
  async seedAdmin() {
    // check if admin exists
    const existing = await this.usersRepo.findOne({ where: { email: 'admin@pmd.com' } });

    if (existing) {
      return { message: 'Admin already exists' };
    }

    // Get admin role
    const adminRole = await this.rolesRepo.findOne({ where: { name: UserRole.ADMINISTRATION } });
    
    if (!adminRole) {
      return { message: 'Admin role not found. Please seed roles first using npm run seed:default' };
    }

    const hashed = await bcrypt.hash('Pmd2024DB', 10);

    const admin = this.usersRepo.create({
      email: 'admin@pmd.com',
      password: hashed,
      name: 'Administrador PMD',
      role_id: adminRole.id,
      is_active: true,
    });

    await this.usersRepo.save(admin);

    return { message: 'Admin created', email: 'admin@pmd.com', password: 'Pmd2024DB' };
  }
}

