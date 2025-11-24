import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { AlertsModule } from '../alerts/alerts.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [AlertsModule, SuppliersModule, ContractsModule],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}

