import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/user.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { JwtUserPayload } from '../interfaces/jwt-user-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'supersecret123'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUserPayload> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: ['role', 'organization'],
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Extract organizationId from user.organization.id or payload
    const organizationId = user.organization?.id ?? payload.organizationId ?? null;

    // Return user object in the exact format expected by the frontend
    // Include all necessary fields for authenticated endpoints
    return {
      id: payload.sub,
      email: payload.email,
      fullName: user.fullName,
      role: payload.role,
      organizationId: organizationId,
      organization: user.organization
        ? {
            id: user.organization?.id ?? null,
            name: user.organization?.name ?? null,
          }
        : null,
    };
  }
}

