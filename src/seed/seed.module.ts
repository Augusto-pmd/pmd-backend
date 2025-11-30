import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/users.entity';
import { Role } from '../roles/roles.entity';
import { SeedAdminController } from './seed.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role])],
  controllers: [SeedAdminController],
})
export class SeedModule {}

