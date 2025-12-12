import { Controller, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './users/user.entity';
import { Role } from './roles/role.entity';
import { UserRole } from './common/enums/user-role.enum';

@Controller('admin-tools')
export class AdminResetController {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(Role)
    private rolesRepo: Repository<Role>,
  ) {}

  @Post('force-admin')
  async forceAdmin() {
    const email = 'admin@pmd.com';
    const plain = '1102Pequ';

    // Buscar rol ADMINISTRATION
    const adminRole = await this.rolesRepo.findOne({
      where: { name: UserRole.ADMINISTRATION },
    });

    if (!adminRole) {
      return {
        message: 'ERROR: ADMINISTRATION role not found. Please create the role first.',
      };
    }

    // Buscar usuario
    let user = await this.usersRepo.findOne({
      where: { email },
      relations: ['role'],
    });

    const hashed = await bcrypt.hash(plain, 10);

    if (!user) {
      // Crear usuario nuevo
      const newUser = this.usersRepo.create({
        email,
        password: hashed,
        fullName: 'Administrador PMD',
        role: adminRole,
        isActive: true,
      });

      user = await this.usersRepo.save(newUser);
      return {
        message: 'Admin created',
        email,
        userId: user.id,
      };
    }

    // Actualizar contraseña del existente
    user.password = hashed;
    user.role = adminRole; // Asegurar que tenga el rol correcto
    user.isActive = true; // Asegurar que esté activo
    user.fullName = 'Administrador PMD'; // Asegurar nombre correcto

    await this.usersRepo.save(user);

    return {
      message: 'Admin password updated',
      email,
      userId: user.id,
    };
  }
}

