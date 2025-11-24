import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkBudgetsService } from './work-budgets.service';
import { WorkBudgetsController } from './work-budgets.controller';
import { WorkBudget } from './work-budgets.entity';
import { Work } from '../works/works.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WorkBudget, Work])],
  controllers: [WorkBudgetsController],
  providers: [WorkBudgetsService],
  exports: [WorkBudgetsService],
})
export class WorkBudgetsModule {}


