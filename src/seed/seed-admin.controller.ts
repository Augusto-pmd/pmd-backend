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
  async createAdmin() {
    const email = 'admin@pmd.com';

    // Si ya existe, devolver mensaje
    const existing = await this.usersRepo.findOne({
      where: { email },
    });

    if (existing) {
      return { message: 'Admin already exists' };
    }

    // Buscar rol ADMINISTRATION
    const adminRole = await this.rolesRepo.findOne({
      where: { name: UserRole.ADMINISTRATION },
    });

    if (!adminRole) {
      return {
        message: 'ERROR: ADMINISTRATION role not found. Please create the role first.',
      };
    }

    // Hashear contraseña
    const hashed = await bcrypt.hash('1102Pequ', 10);

    // Crear usuario
    const admin = this.usersRepo.create({
      email: email,
      password: hashed,
      fullName: 'Administrador PMD',
      role: adminRole,
      isActive: true,
    });

    const savedUser = await this.usersRepo.save(admin);

    return {
      message: 'Admin created',
      user: {
        id: savedUser.id,
        email: savedUser.email,
        fullName: savedUser.fullName,
      },
    };
  }
}

