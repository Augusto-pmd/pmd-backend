import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import typeormConfig from './config/typeorm.config';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { SupplierDocumentsModule } from './supplier-documents/supplier-documents.module';
import { WorksModule } from './works/works.module';
import { WorkBudgetsModule } from './work-budgets/work-budgets.module';
import { WorkDocumentsModule } from './work-documents/work-documents.module';
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
import { AdminResetModule } from './admin-reset.module';
import { DebugModule } from './debug/debug.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [typeormConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get('typeorm') || {},
    }),
    CommonModule,
    AuthModule,
    UsersModule,
    RolesModule,
    SuppliersModule,
    SupplierDocumentsModule,
    WorksModule,
    WorkBudgetsModule,
    WorkDocumentsModule,
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
    AdminResetModule,
    DebugModule,
    HealthModule,
  ],
})
export class AppModule {}
