import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedAdminController } from './seed-admin.controller';
import { User } from '../users/user.entity';
import { Role } from '../roles/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role])],
  controllers: [SeedAdminController],
})
export class SeedAdminModule {}

