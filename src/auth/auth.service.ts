import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { Role } from '../roles/role.entity';
import { Organization } from '../organizations/organization.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { normalizeUser } from '../common/helpers/normalize-user.helper';
import { JwtUserPayload } from './interfaces/jwt-user-payload.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    @InjectRepository(Organization) private readonly orgRepository: Repository<Organization>,
    private readonly jwtService: JwtService,
  ) {}

  async ensureAdminUser(): Promise<void> {
    const adminEmail = 'admin@pmd.com';
    const adminPlainPassword = '1102Pequ';

    let admin = await this.userRepository.findOne({
      where: { email: adminEmail },
      relations: ['role', 'organization'],
    });

    let adminRole = await this.roleRepository.findOne({ where: { name: UserRole.ADMINISTRATION }});
    if (!adminRole) {
      adminRole = this.roleRepository.create({
        name: UserRole.ADMINISTRATION,
        description: 'Default Admin Role',
      });
      adminRole = await this.roleRepository.save(adminRole);
    }

    const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
    let defaultOrg = await this.orgRepository.findOne({ where: { id: DEFAULT_ORG_ID }});
    if (!defaultOrg) {
      defaultOrg = this.orgRepository.create({
        id: DEFAULT_ORG_ID,
        name: 'PMD Arquitectura',
        description: 'Organización por defecto PMD',
      });
      defaultOrg = await this.orgRepository.save(defaultOrg);
    }

    if (!admin) {
      const hashed = await bcrypt.hash(adminPlainPassword, 10);
      admin = this.userRepository.create({
        email: adminEmail,
        password: hashed,
        fullName: 'Administrador PMD',
        role: adminRole,
        organization: defaultOrg,
        isActive: true,
      });
      await this.userRepository.save(admin);
      console.log('✅ Admin user created');
      return;
    }

    let updated = false;

    if (!admin.role) { admin.role = adminRole; updated = true; }
    if (!admin.organization) { admin.organization = defaultOrg; updated = true; }
    if (!admin.isActive) { admin.isActive = true; updated = true; }

    const isHashCorrect = admin.password && admin.password.length >= 50;
    if (!isHashCorrect) {
      admin.password = await bcrypt.hash(adminPlainPassword, 10);
      updated = true;
    }

    if (updated) {
      await this.userRepository.save(admin);
      console.log('🔧 Admin user repaired');
    }
  }

  async validateUser(email: string, password: string) {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['role', 'organization'],
    });

    if (!user || !user.isActive || !user.password) return null;

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;

    return normalizeUser(user);
  }

  async login(loginDto: LoginDto) {
    // Normalize email (trim + lowercase)
    const normalizedEmail = loginDto.email.trim().toLowerCase();

    // Find user by email (include relations: role, organization)
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
      relations: ['role', 'organization'],
    });

    // If user is null, inactive, or has no password, throw UnauthorizedException('USER_NOT_FOUND')
    if (!user || !user.isActive || !user.password) {
      throw new UnauthorizedException('USER_NOT_FOUND');
    }

    // Compare password with bcrypt.compare
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    // If false, throw UnauthorizedException('INVALID_PASSWORD')
    if (!isPasswordValid) {
      throw new UnauthorizedException('INVALID_PASSWORD');
    }

    // If valid, issue JWT and return { accessToken, normalized user }
    // Log permissions for audit
    console.log('[AUTH LOGIN] role.permissions before normalize:', JSON.stringify(user.role?.permissions, null, 2));
    
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
    };

    const normalizedUser = normalizeUser(user);
    console.log('[AUTH LOGIN] normalizedUser.role.permissions:', JSON.stringify(normalizedUser.role?.permissions, null, 2));

    return {
      accessToken: await this.jwtService.signAsync(payload, { expiresIn: '1d' }),
      refresh_token: await this.jwtService.signAsync(payload, { expiresIn: '7d' }),
      user: normalizedUser,
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    if (!registerDto.name) {
      registerDto.name = registerDto.email.split('@')[0] || 'Usuario PMD';
    }

    let role: Role | null = null;
    if (registerDto.role_id) {
      role = await this.roleRepository.findOne({ where: { id: registerDto.role_id } });
    }

    if (!role) {
      role = await this.roleRepository.findOne({ where: { name: UserRole.ADMINISTRATION } });
      if (!role) {
        role = this.roleRepository.create({
          name: UserRole.ADMINISTRATION,
          description: 'Default Admin Role',
        });
        role = await this.roleRepository.save(role);
      }
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = this.userRepository.create({
      fullName: registerDto.name,
      email: registerDto.email,
      password: hashedPassword,
      role: role,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);
    const userWithRelations = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['role', 'organization'],
    });

    if (!userWithRelations) {
      throw new Error('Failed to create user');
    }

    return normalizeUser(userWithRelations);
  }

  async refresh(user: JwtUserPayload) {
    const fullUser = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['role', 'organization'],
    });

    if (!fullUser || !fullUser.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Log permissions for audit
    console.log('[AUTH REFRESH] role.permissions before normalize:', JSON.stringify(fullUser.role?.permissions, null, 2));

    const payload: JwtPayload = {
      sub: fullUser.id,
      email: fullUser.email,
      role: fullUser.role?.name || UserRole.ADMINISTRATION,
    };

    const normalizedUser = normalizeUser(fullUser);
    console.log('[AUTH REFRESH] normalizedUser.role.permissions:', JSON.stringify(normalizedUser.role?.permissions, null, 2));

    return {
      access_token: await this.jwtService.signAsync(payload, { expiresIn: '1d' }),
      refresh_token: await this.jwtService.signAsync(payload, { expiresIn: '7d' }),
      user: normalizedUser,
    };
  }

  async loadMe(user: JwtUserPayload) {
    // Use query builder to ensure role (including permissions) is explicitly loaded
    const fullUser = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.organization', 'organization')
      .where('user.id = :id', { id: user.id })
      .getOne();

    if (!fullUser || !fullUser.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Log permissions for audit
    console.log('[AUTH LOADME] role.permissions before normalize:', JSON.stringify(fullUser.role?.permissions, null, 2));
    const normalizedUser = normalizeUser(fullUser);
    console.log('[AUTH LOADME] normalizedUser.role.permissions:', JSON.stringify(normalizedUser.role?.permissions, null, 2));

    return normalizedUser;
  }
}
