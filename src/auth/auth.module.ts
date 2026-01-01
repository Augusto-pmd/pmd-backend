import { Module, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthBootstrapController } from './auth-bootstrap.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { BruteForceService } from './services/brute-force.service';
import { BruteForceGuard } from './guards/brute-force.guard';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { User } from '../users/user.entity';
import { Role } from '../roles/role.entity';
import { Organization } from '../organizations/organization.entity';

@Module({
  imports: [
    UsersModule,
    AuditModule,
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'supersecret123'),
        signOptions: { 
          algorithm: 'HS256',
          expiresIn: process.env.JWT_EXPIRATION || '1d',
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, Role, Organization]),
  ],
  controllers: [AuthController, AuthBootstrapController],
  providers: [AuthService, JwtStrategy, BruteForceService, BruteForceGuard],
  exports: [AuthService, BruteForceService],
})
export class AuthModule implements OnModuleInit {
  constructor(private readonly authService: AuthService) {}

  async onModuleInit() {
    // Skip ensureAdminUser in test mode - tests manage their own data
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined) {
      return;
    }
    await this.authService.ensureAdminUser();
  }
}

