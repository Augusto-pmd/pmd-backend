import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/user.entity';
import { Role } from '../roles/role.entity';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { getOrganizationId } from '../common/helpers/get-organization-id.helper';

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

  async login(loginDto: LoginDto): Promise<{ access_token: string; refresh_token: string; user: any }> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Ensure organizationId is always present with fallback to default organization
    let organizationId = getOrganizationId(user);
    if (!organizationId) {
      organizationId = "1"; // organización por defecto (UUID string)
    }

    // Ensure organization object is present if frontend expects it
    if (!user.organization) {
      user.organization = { id: "1", name: "PMD Arquitectura" } as any;
    }

    const payload = { 
      sub: user.id,
      email: user.email, 
      role: user.role?.name || null,
      organizationId: organizationId,
    };
    
    const access_token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRATION', '1d'),
    });

    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });
    
    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role?.name || null,
        organizationId: organizationId,
        organization: user.organization,
      },
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
    
    // Reload with role relation to return complete user data
    const userWithRole = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['role'],
    });

    if (!userWithRole) {
      throw new Error('Failed to create user');
    }

    // Remove password from response
    const { password: _, ...result } = userWithRole as any;
    return {
      id: result.id,
      fullName: result.fullName,
      email: result.email,
      isActive: result.isActive,
      role: userWithRole.role ? {
        id: userWithRole.role.id,
        name: userWithRole.role.name,
        description: userWithRole.role.description,
      } : null,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };
  }

  async refresh(user: any): Promise<{ access_token: string; refresh_token: string; user: any }> {
    // Reload user with organization relation
    const fullUser = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['role', 'organization'],
    });

    if (!fullUser || !fullUser.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Ensure organizationId is always present with fallback to default organization
    let organizationId = getOrganizationId(fullUser);
    if (!organizationId) {
      organizationId = "1"; // organización por defecto (UUID string)
    }

    // Ensure organization object is present if frontend expects it
    if (!fullUser.organization) {
      fullUser.organization = { id: "1", name: "PMD Arquitectura" } as any;
    }

    const payload = {
      sub: fullUser.id,
      email: fullUser.email,
      role: fullUser.role?.name || null,
      organizationId: organizationId,
    };

    const access_token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRATION', '1d'),
    });

    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return {
      access_token,
      refresh_token,
      user: {
        id: fullUser.id,
        email: fullUser.email,
        fullName: fullUser.fullName,
        role: fullUser.role?.name || null,
        organizationId: organizationId,
        organization: fullUser.organization,
      },
    };
  }
}
