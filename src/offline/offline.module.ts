import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfflineService } from './offline.service';
import { OfflineController } from './offline.controller';
import { OfflineItem } from './offline-items.entity';
import { ExpensesModule } from '../expenses/expenses.module';
import { IncomesModule } from '../incomes/incomes.module';
import { WorksModule } from '../works/works.module';
import { ContractsModule } from '../contracts/contracts.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { CashMovementsModule } from '../cash-movements/cash-movements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OfflineItem]),
    ExpensesModule,
    IncomesModule,
    WorksModule,
    ContractsModule,
    SuppliersModule,
    CashMovementsModule,
  ],
  controllers: [OfflineController],
  providers: [OfflineService],
  exports: [OfflineService],
})
export class OfflineModule {}

