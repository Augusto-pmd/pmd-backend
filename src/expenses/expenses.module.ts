import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { Expense } from './expenses.entity';
import { Val } from '../val/val.entity';
import { Work } from '../works/works.entity';
import { Supplier } from '../suppliers/suppliers.entity';
import { Contract } from '../contracts/contracts.entity';
import { AccountingRecord } from '../accounting/accounting.entity';
import { SupplierDocument } from '../supplier-documents/supplier-documents.entity';
import { EmployeePayment } from '../payroll/employee-payments.entity';
import { ContractorCertification } from '../contractor-certifications/contractor-certifications.entity';
import { AlertsModule } from '../alerts/alerts.module';
import { ContractsModule } from '../contracts/contracts.module';
import { WorksModule } from '../works/works.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Expense,
      Val,
      Work,
      Supplier,
      Contract,
      AccountingRecord,
      SupplierDocument,
      EmployeePayment,
      ContractorCertification,
    ]),
    AlertsModule,
    ContractsModule,
    WorksModule,
    AccountingModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}

