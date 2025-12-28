import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorksService } from './works.service';
import { WorksController } from './works.controller';
import { Work } from './works.entity';
import { Organization } from '../organizations/organization.entity';
import { Expense } from '../expenses/expenses.entity';
import { Income } from '../incomes/incomes.entity';
import { Schedule } from '../schedule/schedule.entity';
import { ScheduleModule } from '../schedule/schedule.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Work, Organization, Expense, Income, Schedule]),
    forwardRef(() => ScheduleModule),
  ],
  controllers: [WorksController],
  providers: [WorksService],
  exports: [WorksService],
})
export class WorksModule {}


