import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { CsrfGuard } from './common/guards/csrf.guard';
import { XssSanitizeInterceptor } from './common/interceptors/xss-sanitize.interceptor';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { EmployeesModule } from './employees/employees.module';
import { AttendanceModule } from './attendance/attendance.module';
import { EmployeeAdvancesModule } from './employee-advances/employee-advances.module';
import { PayrollModule } from './payroll/payroll.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { SupplierDocumentsModule } from './supplier-documents/supplier-documents.module';
import { ContractorCertificationsModule } from './contractor-certifications/contractor-certifications.module';
import { WorksModule } from './works/works.module';
import { WorkBudgetsModule } from './work-budgets/work-budgets.module';
import { WorkDocumentsModule } from './work-documents/work-documents.module';
import { WorkUsersModule } from './work-users/work-users.module';
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
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { OfflineModule } from './offline/offline.module';
import { BackupModule } from './backup/backup.module';
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
    }),
    // Only load ScheduleModule in non-test environments
    ...(process.env.NODE_ENV !== 'test' && process.env.JEST_WORKER_ID === undefined
      ? [NestScheduleModule.forRoot()]
      : []),
    // This TypeORM module will be overridden by TestDatabaseModule in tests
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: databaseConfig,
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      // Aumentar límite en desarrollo/test para permitir más tests E2E
      // Producción: 10 requests/minuto, Desarrollo/Test: 100 requests/minuto
      limit: process.env.NODE_ENV === 'production' ? 10 : 100,
    }]),
    // Only load second TypeORM module in non-test environments when DATABASE_URL is set
    // Tests use TestDatabaseModule which overrides the first TypeORM module
    // Note: This second module may be redundant - the first TypeOrmModule.forRootAsync already handles DATABASE_URL
    ...(process.env.NODE_ENV !== 'test' && 
        process.env.JEST_WORKER_ID === undefined &&
        process.env.DATABASE_URL
      ? [TypeOrmModule.forRoot({
          type: 'postgres',
          url: process.env.DATABASE_URL,
          autoLoadEntities: true,
          synchronize: false,
          // Render always requires SSL when using DATABASE_URL
          ssl: (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('sslmode=require'))
            ? { rejectUnauthorized: false }
            : false,
        })]
      : []),
    CommonModule,
    AuthModule,
    UsersModule,
    RolesModule,
    EmployeesModule,
    AttendanceModule,
    EmployeeAdvancesModule,
    PayrollModule,
    SuppliersModule,
    SupplierDocumentsModule,
    ContractorCertificationsModule,
    WorksModule,
    WorkBudgetsModule,
    WorkDocumentsModule,
    WorkUsersModule,
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
    ExchangeRatesModule,
    OfflineModule,
    BackupModule,
    DashboardModule,
    TasksModule,
    StorageModule,
    AdminResetModule,
    ...(process.env.NODE_ENV !== 'production' ? [DebugModule] : []),
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: XssSanitizeInterceptor,
    },
  ],
})
export class AppModule {}
