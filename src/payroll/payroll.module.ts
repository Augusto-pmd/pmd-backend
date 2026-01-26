import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { EmployeePayment } from './employee-payments.entity';
import { Employee } from '../employees/employees.entity';
import { Attendance } from '../attendance/attendance.entity';
import { EmployeeAdvance } from '../employee-advances/employee-advances.entity';
import { ExpensesModule } from '../expenses/expenses.module';
import { ContractorCertificationsModule } from '../contractor-certifications/contractor-certifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmployeePayment, Employee, Attendance, EmployeeAdvance]),
    ExpensesModule,
    ContractorCertificationsModule,
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}

