import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/user.entity';
import { Role } from '../roles/role.entity';
import { Organization } from '../organizations/organization.entity';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';
import { getDefaultRole } from '../common/helpers/get-default-role.helper';
import { normalizeUser } from '../common/helpers/normalize-user.helper';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['role', 'organization'],
    });

    if (!user) {
      return null;
    }

    if (!user.isActive) {
      return null;
    }

    if (!user.password) {
      return null;
    }

    try {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return null;
      }
    } catch (error) {
      return null;
    }

    const { password: _, ...result } = user;
    return result;
  }

  /**
   * Ensures user has organization and role assigned
   * Returns the user entity with relations loaded
   */
  private async ensureUserOrganizationAndRole(userId: string): Promise<User> {
    const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
    
    // Load user with all relations
    let user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role', 'organization'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const orgRepository = this.userRepository.manager.getRepository(Organization);
    let needsSave = false;

    // Ensure organization exists
    let organizationId = getOrganizationId(user);
    if (!organizationId || !user.organization) {
      let defaultOrg = await orgRepository.findOne({ where: { id: DEFAULT_ORG_ID } });
      
      if (!defaultOrg) {
        // Create default organization if it doesn't exist
        defaultOrg = orgRepository.create({
          id: DEFAULT_ORG_ID,
          name: 'PMD Arquitectura',
          description: 'Organización por defecto PMD',
        });
        defaultOrg = await orgRepository.save(defaultOrg);
      }
      
      user.organization = defaultOrg;
      user.organizationId = DEFAULT_ORG_ID;
      needsSave = true;
    }

    // Ensure role exists
    if (!user.role) {
      const defaultRoleEntity = await this.roleRepository.findOne({
        where: { id: (await getDefaultRole(this.roleRepository)).id },
      });
      
      if (defaultRoleEntity) {
        user.role = defaultRoleEntity;
        needsSave = true;
      }
    }

    if (needsSave) {
      user = await this.userRepository.save(user);
      // Reload to ensure relations are fresh
      user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['role', 'organization'],
      });
    }

    return user!;
  }

  async login(loginDto: LoginDto): Promise<{ access_token: string; refresh_token: string; user: any }> {
    const validatedUser = await this.validateUser(loginDto.email, loginDto.password);
    if (!validatedUser) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Ensure user has organization and role
    const user = await this.ensureUserOrganizationAndRole(validatedUser.id);

    // Get organizationId for JWT payload
    const organizationId = getOrganizationId(user) || user.organization?.id || '00000000-0000-0000-0000-000000000001';
    const roleName = user.role?.name?.toString() || (await getDefaultRole(this.roleRepository)).name;

    const payload = { 
      sub: user.id,
      email: user.email, 
      role: roleName,
      organizationId: organizationId,
    };
    
    const access_token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRATION', '1d'),
    });

    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });
    
    // Return normalized user using shared helper
    return {
      access_token,
      refresh_token,
      user: normalizeUser(user),
    };
  }

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    
    // Get role by ID
    const role = await this.roleRepository.findOne({ where: { id: registerDto.role_id } });
    if (!role) {
      throw new ConflictException('Role not found');
    }

    // Create user entity
    const user = this.userRepository.create({
      fullName: registerDto.name,
      email: registerDto.email,
      password: hashedPassword,
      role: role,
      isActive: true,
    });

    // Save user to database
    const savedUser = await this.userRepository.save(user);
    
    // Reload with all relations to return complete user data
    const userWithRelations = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['role', 'organization'],
    });

    if (!userWithRelations) {
      throw new Error('Failed to create user');
    }

    // Return normalized user using shared helper for consistency
    return normalizeUser(userWithRelations);
  }

  async refresh(user: any): Promise<{ access_token: string; refresh_token: string; user: any }> {
    // Ensure user has organization and role
    const fullUser = await this.ensureUserOrganizationAndRole(user.id);

    if (!fullUser.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    // Get organizationId for JWT payload
    const organizationId = getOrganizationId(fullUser) || fullUser.organization?.id || '00000000-0000-0000-0000-000000000001';
    const roleName = fullUser.role?.name?.toString() || (await getDefaultRole(this.roleRepository)).name;

    const payload = {
      sub: fullUser.id,
      email: fullUser.email,
      role: roleName,
      organizationId: organizationId,
    };

    const access_token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRATION', '1d'),
    });

    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    // Return normalized user using shared helper
    return {
      access_token,
      refresh_token,
      user: normalizeUser(fullUser),
    };
  }

  async loadMe(user: any): Promise<any> {
    // Ensure user has organization and role
    const fullUser = await this.ensureUserOrganizationAndRole(user.id);

    if (!fullUser.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    // Return normalized user using shared helper
    return normalizeUser(fullUser);
  }
}
