import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Role } from '../roles/role.entity';
import { SeedAdminController } from './seed-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role])],
  controllers: [SeedAdminController],
})
export class SeedAdminModule {}

