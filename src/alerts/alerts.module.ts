import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { Alert } from './alerts.entity';
import { SupplierDocument } from '../supplier-documents/supplier-documents.entity';
import { Expense } from '../expenses/expenses.entity';
import { Contract } from '../contracts/contracts.entity';
import { Schedule } from '../schedule/schedule.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert, SupplierDocument, Expense, Contract, Schedule]),
  ],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}

