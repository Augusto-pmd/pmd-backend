import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../roles/role.entity';
import { SeedDefaultController } from './seed-default.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Role])],
  controllers: [SeedDefaultController],
})
export class SeedDefaultModule {}
