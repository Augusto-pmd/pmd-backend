import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorksService } from './works.service';
import { WorksController } from './works.controller';
import { Work } from './works.entity';
import { Organization } from '../organizations/organization.entity';
import { Expense } from '../expenses/expenses.entity';
import { Income } from '../incomes/incomes.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Work, Organization, Expense, Income])],
  controllers: [WorksController],
  providers: [WorksService],
  exports: [WorksService],
})
export class WorksModule {}


