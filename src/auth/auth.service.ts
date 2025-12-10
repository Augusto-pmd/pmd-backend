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

    // Default organization UUID (same as in seed)
    const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

    // Ensure organizationId is always present in database
    let organizationId = getOrganizationId(user);
    if (!organizationId) {
      // If user doesn't have organizationId, assign default organization
      const fullUser = await this.userRepository.findOne({
        where: { id: user.id },
        relations: ['organization'],
      });
      
      if (fullUser && !fullUser.organization) {
        // Try to find default organization
        const orgRepository = this.userRepository.manager.getRepository(Organization);
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
        
        fullUser.organization = defaultOrg;
        await this.userRepository.save(fullUser);
        organizationId = DEFAULT_ORG_ID;
        user.organization = defaultOrg;
      } else if (fullUser?.organization) {
        organizationId = fullUser.organization.id;
        user.organization = fullUser.organization;
      } else {
        organizationId = DEFAULT_ORG_ID;
      }
    } else if (!user.organization) {
      // If organizationId exists but organization object is not loaded, load it
      const fullUser = await this.userRepository.findOne({
        where: { id: user.id },
        relations: ['organization'],
      });
      if (fullUser?.organization) {
        user.organization = fullUser.organization;
        organizationId = fullUser.organization.id;
      } else {
        // Try to load organization by ID
        const orgRepository = this.userRepository.manager.getRepository(Organization);
        const org = await orgRepository.findOne({ where: { id: organizationId } });
        if (org) {
          user.organization = org;
        } else {
          // Fallback to default if organizationId doesn't exist in DB
          const defaultOrg = await orgRepository.findOne({ where: { id: DEFAULT_ORG_ID } });
          if (defaultOrg) {
            user.organization = defaultOrg;
            organizationId = DEFAULT_ORG_ID;
          } else {
            user.organization = { id: organizationId, name: 'PMD Arquitectura' } as any;
          }
        }
      }
    }

    // Ensure organization object is present if frontend expects it
    if (!user.organization) {
      user.organization = { id: organizationId, name: 'PMD Arquitectura' } as any;
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
        organization: user.organization && {
          id: user.organization.id,
          name: user.organization.name,
        },
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

    // Default organization UUID (same as in seed)
    const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

    // Ensure organizationId is always present in database
    let organizationId = getOrganizationId(fullUser);
    if (!organizationId) {
      // If user doesn't have organizationId, assign default organization
      const orgRepository = this.userRepository.manager.getRepository(Organization);
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
      
      fullUser.organization = defaultOrg;
      await this.userRepository.save(fullUser);
      organizationId = DEFAULT_ORG_ID;
    } else if (!fullUser.organization) {
      // If organizationId exists but organization object is not loaded, load it
      const orgRepository = this.userRepository.manager.getRepository(Organization);
      const org = await orgRepository.findOne({ where: { id: organizationId } });
      if (org) {
        fullUser.organization = org;
      } else {
        // Fallback to default if organizationId doesn't exist in DB
        const defaultOrg = await orgRepository.findOne({ where: { id: DEFAULT_ORG_ID } });
        if (defaultOrg) {
          fullUser.organization = defaultOrg;
          organizationId = DEFAULT_ORG_ID;
        } else {
          fullUser.organization = { id: organizationId, name: 'PMD Arquitectura' } as any;
        }
      }
    }

    // Ensure organization object is present if frontend expects it
    if (!fullUser.organization) {
      fullUser.organization = { id: organizationId, name: 'PMD Arquitectura' } as any;
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
        organization: fullUser.organization && {
          id: fullUser.organization.id,
          name: fullUser.organization.name,
        },
      },
    };
  }

  async loadMe(user: any): Promise<any> {
    // Reload user with organization relation
    const fullUser = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['role', 'organization'],
    });

    if (!fullUser || !fullUser.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Default organization UUID (same as in seed)
    const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

    // Ensure organizationId is always present
    let organizationId = getOrganizationId(fullUser);
    if (!organizationId) {
      // If user doesn't have organizationId, assign default organization
      const orgRepository = this.userRepository.manager.getRepository(Organization);
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
      
      fullUser.organization = defaultOrg;
      await this.userRepository.save(fullUser);
      organizationId = DEFAULT_ORG_ID;
    } else if (!fullUser.organization) {
      // If organizationId exists but organization object is not loaded, load it
      const orgRepository = this.userRepository.manager.getRepository(Organization);
      const org = await orgRepository.findOne({ where: { id: organizationId } });
      if (org) {
        fullUser.organization = org;
      } else {
        // Fallback to default if organizationId doesn't exist in DB
        const defaultOrg = await orgRepository.findOne({ where: { id: DEFAULT_ORG_ID } });
        if (defaultOrg) {
          fullUser.organization = defaultOrg;
          organizationId = DEFAULT_ORG_ID;
        } else {
          fullUser.organization = { id: organizationId, name: 'PMD Arquitectura' } as any;
        }
      }
    }

    // Ensure organization object is present
    if (!fullUser.organization) {
      fullUser.organization = { id: organizationId, name: 'PMD Arquitectura' } as any;
    }

    return {
      id: fullUser.id,
      email: fullUser.email,
      fullName: fullUser.fullName,
      role: fullUser.role?.name || null,
      organizationId: organizationId,
      organization: fullUser.organization && {
        id: fullUser.organization.id,
        name: fullUser.organization.name,
      },
    };
  }
}
