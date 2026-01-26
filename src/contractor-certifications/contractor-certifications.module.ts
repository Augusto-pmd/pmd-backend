import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractorCertification } from './contractor-certifications.entity';
import { ContractorCertificationsService } from './contractor-certifications.service';
import { ContractorCertificationsController } from './contractor-certifications.controller';
import { Supplier } from '../suppliers/suppliers.entity';
import { Contract } from '../contracts/contracts.entity';
import { ExpensesModule } from '../expenses/expenses.module';
import { AlertsModule } from '../alerts/alerts.module';
import { Alert } from '../alerts/alerts.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContractorCertification, Supplier, Contract, Alert]),
    ExpensesModule,
    AlertsModule,
  ],
  controllers: [ContractorCertificationsController],
  providers: [ContractorCertificationsService],
  exports: [ContractorCertificationsService],
})
export class ContractorCertificationsModule {}

