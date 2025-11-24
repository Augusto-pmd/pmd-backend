import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { SupplierDocumentsModule } from './supplier-documents/supplier-documents.module';
import { WorksModule } from './works/works.module';
import { WorkBudgetsModule } from './work-budgets/work-budgets.module';
import { ContractsModule } from './contracts/contracts.module';
import { RubricsModule } from './rubrics/rubrics.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ValModule } from './val/val.module';
import { IncomesModule } from './incomes/incomes.module';
import { CashboxesModule } from './cashboxes/cashboxes.module';
import { CashMovementsModule } from './cash-movements/cash-movements.module';
import { ScheduleModule } from './schedule/schedule.module';
import { AlertsModule } from './alerts/alerts.module';
import { AccountingModule } from './accounting/accounting.module';
import { AuditModule } from './audit/audit.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { TasksModule } from './tasks/tasks.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: databaseConfig,
      inject: [ConfigService],
    }),
    CommonModule,
    AuthModule,
    UsersModule,
    RolesModule,
    SuppliersModule,
    SupplierDocumentsModule,
    WorksModule,
    WorkBudgetsModule,
    ContractsModule,
    RubricsModule,
    ExpensesModule,
    ValModule,
    IncomesModule,
    CashboxesModule,
    CashMovementsModule,
    ScheduleModule,
    AlertsModule,
    AccountingModule,
    AuditModule,
    DashboardModule,
    TasksModule,
    StorageModule,
  ],
})
export class AppModule {}
