import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../audit/audit.entity';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { CsrfService } from './services/csrf.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditInterceptor, CsrfService],
  exports: [AuditInterceptor, CsrfService],
})
export class CommonModule {}

