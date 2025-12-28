import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { Schedule } from './schedule.entity';
import { Work } from '../works/works.entity';
import { WorksModule } from '../works/works.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Schedule, Work]),
    forwardRef(() => WorksModule),
  ],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}

