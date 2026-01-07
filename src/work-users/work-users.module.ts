import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkUsersService } from './work-users.service';
import { WorkUsersController } from './work-users.controller';
import { WorkUser } from './work-users.entity';
import { Work } from '../works/works.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WorkUser, Work, User])],
  controllers: [WorkUsersController],
  providers: [WorkUsersService],
  exports: [WorkUsersService],
})
export class WorkUsersModule {}

