# 🔒 DIFF COMPLETO - Sistema PMD Backend: Seguridad y Roles Reescritos

## 🎯 OBJETIVO

Reescribir completamente el sistema de roles y seguridad del backend PMD para usar **solo 3 roles oficiales**: `ADMIN`, `OPERATOR`, `AUDITOR`, eliminando todas las referencias a `ADMINISTRATION`, `DIRECTION`, `SUPERVISOR`.

---

## 📊 MODELO DE ROLES FINAL (PMD OFICIAL)

### Roles Definidos:
- **ADMIN** → Acceso total (equivalente a ADMINISTRATION + DIRECTION)
- **OPERATOR** → CRUD general (sin Users ni Audit)
- **AUDITOR** → Solo lectura, excepto Audit (acceso completo de lectura)

### Permisos por Módulo:

| Módulo | ADMIN | OPERATOR | AUDITOR |
|--------|-------|----------|---------|
| **Works** | CRUD completo | CRUD completo | Solo lectura |
| **Accounting** | CRUD + Summary | CRUD transacciones | Solo lectura |
| **Contracts** | CRUD completo | CRUD completo | Solo lectura |
| **Alerts** | CRUD completo | CRUD completo | Solo lectura |
| **Audit** | Lectura completa | Acceso denegado | Lectura completa |
| **Users** | CRUD completo | Acceso denegado | Acceso denegado |
| **Roles** | CRUD completo | Acceso denegado | Acceso denegado |

---

## 📝 ARCHIVOS A MODIFICAR/CREAR

### 🔵 1. ENUM Y ROLES BASE

#### **src/common/enums/user-role.enum.ts** - REESCRIBIR COMPLETAMENTE
```typescript
export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  AUDITOR = 'auditor',
}
```

#### **src/seed/default-admin.seed.ts** - REESCRIBIR COMPLETAMENTE
```typescript
// Cambiar roles a crear:
const rolesToCreate = [
  {
    name: UserRole.ADMIN,
    description: 'Administrator role with full system access',
    permissions: {
      users: ['create', 'read', 'update', 'delete'],
      roles: ['create', 'read', 'update', 'delete'],
      works: ['create', 'read', 'update', 'delete'],
      expenses: ['create', 'read', 'update', 'delete', 'validate'],
      suppliers: ['create', 'read', 'update', 'delete'],
      contracts: ['create', 'read', 'update', 'delete'],
      cashboxes: ['create', 'read', 'update', 'delete', 'close'],
      accounting: ['create', 'read', 'update', 'delete', 'summary'],
      alerts: ['create', 'read', 'update', 'delete'],
      audit: ['read'],
    },
  },
  {
    name: UserRole.OPERATOR,
    description: 'Operator role with CRUD access (except Users and Audit)',
    permissions: {
      works: ['create', 'read', 'update', 'delete'],
      expenses: ['create', 'read', 'update', 'delete'],
      suppliers: ['create', 'read', 'update', 'delete'],
      contracts: ['create', 'read', 'update', 'delete'],
      cashboxes: ['create', 'read', 'update', 'delete', 'close'],
      accounting: ['create', 'read', 'update', 'delete'],
      alerts: ['create', 'read', 'update', 'delete'],
    },
  },
  {
    name: UserRole.AUDITOR,
    description: 'Auditor role with read-only access (except Audit: full read)',
    permissions: {
      works: ['read'],
      expenses: ['read'],
      suppliers: ['read'],
      contracts: ['read'],
      cashboxes: ['read'],
      accounting: ['read'],
      alerts: ['read'],
      audit: ['read'],
    },
  },
];

// Cambiar referencia de adminRole:
const adminRole = createdRoles[UserRole.ADMIN];
```

---

### 🔵 2. GUARDS Y DECORATORS

#### **src/common/guards/roles.guard.ts** - REESCRIBIR COMPLETAMENTE
```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No roles required, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('User role not found');
    }

    const userRole = user.role.name || user.role;

    // ADMIN has full access
    if (userRole === UserRole.ADMIN) {
      return true;
    }

    // Check if user role is in required roles
    if (requiredRoles.includes(userRole)) {
      return true;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
```

#### **src/common/decorators/current-user.decorator.ts** - NUEVO ARCHIVO
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

---

### 🔵 3. AUTH COMPLETA

#### **src/auth/auth.controller.ts** - AGREGAR ENDPOINTS
```typescript
// AGREGAR después de @Post('register'):
import { Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Get('me')
@UseGuards(JwtAuthGuard)
@ApiOperation({ summary: 'Get current user profile' })
@ApiResponse({ status: 200, description: 'Current user information' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
async getProfile(@CurrentUser() user: any) {
  return this.authService.getProfile(user);
}

@Post('refresh')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Refresh access token' })
@ApiBody({ type: RefreshTokenDto })
@ApiResponse({ status: 200, description: 'Token refreshed successfully' })
@ApiResponse({ status: 401, description: 'Invalid refresh token' })
async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
  return this.authService.refreshToken(refreshTokenDto.refresh_token);
}
```

#### **src/auth/auth.service.ts** - AGREGAR MÉTODOS
```typescript
// AGREGAR después de register():
async getProfile(user: any): Promise<any> {
  const fullUser = await this.userRepository.findOne({
    where: { id: user.id },
    relations: ['role'],
  });
  
  if (!fullUser || !fullUser.is_active) {
    throw new UnauthorizedException('User not found or inactive');
  }
  
  const { password: _, ...result } = fullUser as any;
  return {
    id: result.id,
    name: result.name,
    email: result.email,
    phone: result.phone,
    is_active: result.is_active,
    role: result.role ? {
      id: result.role.id,
      name: result.role.name,
      description: result.role.description,
    } : null,
    created_at: result.created_at,
    updated_at: result.updated_at,
  };
}

async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
  try {
    const configService = this.moduleRef.get(ConfigService, { strict: false });
    const refreshSecret = configService.get<string>('JWT_REFRESH_SECRET', 'refresh-secret-123');
    
    const payload = this.jwtService.verify(refreshToken, {
      secret: refreshSecret,
    });
    
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }
    
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: ['role'],
    });
    
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    
    const newPayload = {
      email: user.email,
      sub: user.id,
      role: user.role?.name || null,
    };
    
    const access_token = this.jwtService.sign(newPayload);
    
    return { access_token };
  } catch (error) {
    throw new UnauthorizedException('Invalid refresh token');
  }
}

// MODIFICAR login() para incluir refresh_token:
async login(loginDto: LoginDto): Promise<{ access_token: string; refresh_token: string; user: any }> {
  const user = await this.validateUser(loginDto.email, loginDto.password);
  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }

  const payload = { 
    email: user.email, 
    sub: user.id, 
    role: user.role?.name || null 
  };
  
  const access_token = this.jwtService.sign(payload);
  
  // Generate refresh token
  const refreshPayload = { 
    ...payload,
    type: 'refresh',
  };
  
  const configService = this.moduleRef.get(ConfigService, { strict: false });
  const refreshSecret = configService.get<string>('JWT_REFRESH_SECRET', 'refresh-secret-123');
  const refreshExpiration = configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');
  
  const refresh_token = this.jwtService.sign(refreshPayload, {
    secret: refreshSecret,
    expiresIn: refreshExpiration,
  });
  
  return {
    access_token,
    refresh_token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role ? {
        id: user.role.id,
        name: user.role.name,
      } : null,
    },
  };
}
```

#### **src/auth/auth.service.ts** - AGREGAR IMPORTS
```typescript
// AGREGAR al inicio:
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

// MODIFICAR constructor:
constructor(
  @InjectRepository(User)
  private userRepository: Repository<User>,
  private jwtService: JwtService,
  private moduleRef: ModuleRef, // AGREGAR
) {}
```

#### **src/auth/dto/refresh-token.dto.ts** - NUEVO ARCHIVO
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}
```

---

### 🔵 4. AUDITORÍA AUTOMÁTICA REAL

#### **src/common/interceptors/audit.interceptor.ts** - REESCRIBIR COMPLETAMENTE
```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AuditLog } from '../../audit/audit.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, params, query, user, ip, headers } = request;

    const action = `${method} ${url}`;
    const module = url.split('/')[1] || 'unknown';
    const entityId = params?.id || body?.id || null;
    const entityType = this.getEntityType(url);
    const ipAddress = ip || headers['x-forwarded-for'] || 'unknown';
    const userAgent = headers['user-agent'] || 'unknown';
    const criticality = this.getCriticality(method, module);

    // Capture oldValue BEFORE executing the request
    let oldValue: any = null;
    
    if (['PUT', 'PATCH', 'DELETE'].includes(method) && entityId) {
      try {
        oldValue = await this.getOldValue(entityType, entityId);
      } catch (error) {
        console.error('Error capturing oldValue:', error);
        // Continue even if oldValue capture fails
      }
    }

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const auditLog = this.auditLogRepository.create({
            user_id: user?.id || null,
            action,
            module,
            entity_id: entityId,
            entity_type: entityType,
            previous_value: oldValue ? this.sanitizeData(oldValue) : null,
            new_value: this.sanitizeData(response),
            ip_address: ipAddress,
            user_agent: userAgent,
            criticality,
          });

          await this.auditLogRepository.save(auditLog);
        } catch (error) {
          // Don't fail the request if audit logging fails
          console.error('Audit logging failed:', error);
        }
      }),
    );
  }

  private async getOldValue(entityType: string, entityId: string): Promise<any> {
    // Map entity types to repositories
    const entityMap: Record<string, string> = {
      'works': 'Work',
      'accounting': 'AccountingRecord',
      'contracts': 'Contract',
      'alerts': 'Alert',
      'users': 'User',
      'roles': 'Role',
      'suppliers': 'Supplier',
      'expenses': 'Expense',
      'cashboxes': 'Cashbox',
      'incomes': 'Income',
      'schedule': 'Schedule',
    };

    const entityName = entityMap[entityType];
    if (!entityName) {
      return null;
    }

    try {
      const repository = this.dataSource.getRepository(entityName);
      const entity = await repository.findOne({ where: { id: entityId } });
      return entity;
    } catch (error) {
      console.error(`Error fetching oldValue for ${entityType}:`, error);
      return null;
    }
  }

  private getEntityType(url: string): string {
    const parts = url.split('/').filter(Boolean);
    // Remove 'api' prefix if present
    const moduleIndex = parts[0] === 'api' ? 1 : 0;
    return parts[moduleIndex] || 'unknown';
  }

  private getCriticality(method: string, module: string): string {
    if (method === 'DELETE') return 'high';
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      if (['users', 'roles', 'accounting'].includes(module)) return 'high';
      return 'medium';
    }
    return 'low';
  }

  private sanitizeData(data: any): any {
    if (!data) return null;
    if (typeof data !== 'object') return data;

    const sanitized = { ...data };
    // Remove sensitive fields
    if (sanitized.password) delete sanitized.password;
    if (sanitized.token) delete sanitized.token;
    if (sanitized.refreshToken) delete sanitized.refreshToken;
    if (sanitized.access_token) delete sanitized.access_token;
    if (sanitized.refresh_token) delete sanitized.refresh_token;

    return sanitized;
  }
}
```

#### **src/common/common.module.ts** - AGREGAR DATASOURCE
```typescript
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditLog } from '../audit/audit.entity';
import { AuditInterceptor } from './interceptors/audit.interceptor';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [
    AuditInterceptor,
    {
      provide: DataSource,
      useFactory: (dataSource: DataSource) => dataSource,
      inject: [DataSource],
    },
  ],
  exports: [AuditInterceptor],
})
export class CommonModule {}
```

#### **src/main.ts** - APLICAR INTERCEPTOR GLOBALMENTE
```typescript
// AGREGAR después de crear la app:
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ... código existente de CORS, Swagger, etc. ...
  
  // Aplicar AuditInterceptor globalmente
  const auditInterceptor = app.get(AuditInterceptor);
  app.useGlobalInterceptors(auditInterceptor);
  
  // ... resto del código ...
}
```

---

### 🔵 5. CONTROLADORES - ACTUALIZAR ROLES

#### **src/works/works.controller.ts** - REEMPLAZAR ROLES
```typescript
// CAMBIAR TODOS:
@Post()
@Roles(UserRole.ADMIN, UserRole.OPERATOR) // Era: DIRECTION

@Get()
@Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.AUDITOR) // Era: SUPERVISOR, ADMINISTRATION, DIRECTION

@Get(':id')
@Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.AUDITOR) // Era: SUPERVISOR, ADMINISTRATION, DIRECTION, OPERATOR

@Patch(':id')
@Roles(UserRole.ADMIN, UserRole.OPERATOR) // Era: DIRECTION, SUPERVISOR

@Delete(':id')
@Roles(UserRole.ADMIN) // Era: DIRECTION
```

#### **src/accounting/accounting.controller.ts** - REEMPLAZAR ROLES Y AGREGAR SUMMARY
```typescript
// CAMBIAR TODOS:
@Post()
@Roles(UserRole.ADMIN, UserRole.OPERATOR) // Era: ADMINISTRATION, DIRECTION

@Get()
@Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.AUDITOR) // Era: ADMINISTRATION, DIRECTION

// AGREGAR NUEVO ENDPOINT:
@Get('summary')
@Roles(UserRole.ADMIN)
@ApiOperation({ summary: 'Get accounting summary' })
@ApiResponse({ status: 200, description: 'Accounting summary' })
getSummary(@Request() req) {
  return this.accountingService.getSummary(req.user);
}

// CAMBIAR TODOS LOS DEMÁS:
@Get('month/:month/:year')
@Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.AUDITOR) // Era: ADMINISTRATION, DIRECTION

@Get('purchases-book')
@Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.AUDITOR) // Era: ADMINISTRATION, DIRECTION

@Get('perceptions')
@Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.AUDITOR) // Era: ADMINISTRATION, DIRECTION

@Get('withholdings')
@Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.AUDITOR) // Era: ADMINISTRATION, DIRECTION

@Get(':id')
@Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.AUDITOR) // Era: ADMINISTRATION, DIRECTION

@Patch(':id')
@Roles(UserRole.ADMIN, UserRole.OPERATOR) // Era: ADMINISTRATION, DIRECTION

@Post('close-month')
@Roles(UserRole.ADMIN) // Era: ADMINISTRATION, DIRECTION

@Post('reopen-month/:month/:year')
@Roles(UserRole.ADMIN) // Era: DIRECTION

@Delete(':id')
@Roles(UserRole.ADMIN) // Era: DIRECTION
```

#### **src/accounting/accounting.service.ts** - AGREGAR getSummary Y ACTUALIZAR ROLES
```typescript
// AGREGAR método:
async getSummary(user: User): Promise<any> {
  // Solo ADMIN puede ver resumen
  if (user.role.name !== UserRole.ADMIN) {
    throw new ForbiddenException('Only ADMIN can view summary');
  }
  
  const records = await this.accountingRepository.find({
    relations: ['expense', 'work', 'supplier'],
  });
  
  const totalAmount = records.reduce(
    (sum, r) => sum + parseFloat(r.amount?.toString() || '0'),
    0,
  );
  
  const totalVat = records.reduce(
    (sum, r) => sum + parseFloat(r.vat_amount?.toString() || '0'),
    0,
  );
  
  const byMonth = records.reduce((acc, r) => {
    const key = `${r.year}-${r.month}`;
    if (!acc[key]) {
      acc[key] = { month: r.month, year: r.year, total: 0, count: 0 };
    }
    acc[key].total += parseFloat(r.amount?.toString() || '0');
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, any>);
  
  return {
    total_records: records.length,
    total_amount: totalAmount,
    total_vat: totalVat,
    by_month: Object.values(byMonth),
    open_months: records.filter(r => r.month_status === MonthStatus.OPEN).length,
    closed_months: records.filter(r => r.month_status === MonthStatus.CLOSED).length,
  };
}

// CAMBIAR TODAS LAS REFERENCIAS:
// UserRole.DIRECTION → UserRole.ADMIN
// UserRole.ADMINISTRATION → UserRole.ADMIN
// UserRole.SUPERVISOR → UserRole.OPERATOR (donde corresponda)
```

#### **src/contracts/contracts.controller.ts** - REEMPLAZAR ROLES
```typescript
// CAMBIAR TODOS:
@Post()
@Roles(UserRole.ADMIN, UserRole.OPERATOR) // Era: ADMINISTRATION, DIRECTION

@Get()
@Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.AUDITOR) // Era: SUPERVISOR, ADMINISTRATION, DIRECTION

@Get(':id')
@Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.AUDITOR) // Era: SUPERVISOR, ADMINISTRATION, DIRECTION

@Patch(':id')
@Roles(UserRole.ADMIN, UserRole.OPERATOR) // Era: ADMINISTRATION, DIRECTION

@Delete(':id')
@Roles(UserRole.ADMIN) // Era: DIRECTION
```

#### **src/contracts/contracts.service.ts** - ACTUALIZAR ROLES
```typescript
// CAMBIAR:
// UserRole.DIRECTION → UserRole.ADMIN
```

#### **src/alerts/alerts.controller.ts** - REEMPLAZAR ROLES
```typescript
// CAMBIAR TODOS:
@Post()
@Roles(UserRole.ADMIN, UserRole.OPERATOR) // Era: ADMINISTRATION, DIRECTION

@Get()
@Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.AUDITOR) // Era: OPERATOR, SUPERVISOR, ADMINISTRATION, DIRECTION

@Get('unread')
@Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.AUDITOR) // Era: OPERATOR, SUPERVISOR, ADMINISTRATION, DIRECTION

@Get(':id')
@Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.AUDITOR) // Era: OPERATOR, SUPERVISOR, ADMINISTRATION, DIRECTION

@Patch(':id')
@Roles(UserRole.ADMIN, UserRole.OPERATOR) // Era: ADMINISTRATION, DIRECTION

@Patch(':id/mark-read')
@Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.AUDITOR) // Era: OPERATOR, SUPERVISOR, ADMINISTRATION, DIRECTION

@Delete(':id')
@Roles(UserRole.ADMIN) // Era: DIRECTION
```

#### **src/alerts/alerts.service.ts** - ACTUALIZAR ROLES
```typescript
// CAMBIAR:
// 'operator' → UserRole.OPERATOR
// 'direction' → UserRole.ADMIN
```

#### **src/audit/audit.controller.ts** - REEMPLAZAR ROLES
```typescript
// CAMBIAR TODOS:
@Get()
@Roles(UserRole.ADMIN, UserRole.AUDITOR) // Era: DIRECTION, ADMINISTRATION

@Get(':id')
@Roles(UserRole.ADMIN, UserRole.AUDITOR) // Era: DIRECTION, ADMINISTRATION

@Get('module/:module')
@Roles(UserRole.ADMIN, UserRole.AUDITOR) // Era: DIRECTION, ADMINISTRATION

@Get('user/:userId')
@Roles(UserRole.ADMIN, UserRole.AUDITOR) // Era: DIRECTION, ADMINISTRATION
```

#### **src/users/users.controller.ts** - REEMPLAZAR ROLES
```typescript
// CAMBIAR TODOS:
@Post()
@Roles(UserRole.ADMIN) // Era: DIRECTION

@Get()
@Roles(UserRole.ADMIN) // Era: DIRECTION, SUPERVISOR, ADMINISTRATION

@Get(':id')
@Roles(UserRole.ADMIN) // Era: DIRECTION, SUPERVISOR, ADMINISTRATION

@Patch(':id')
@Roles(UserRole.ADMIN) // Era: DIRECTION

@Delete(':id')
@Roles(UserRole.ADMIN) // Era: DIRECTION
```

#### **src/roles/roles.controller.ts** - REEMPLAZAR ROLES
```typescript
// CAMBIAR TODOS:
@Post()
@Roles(UserRole.ADMIN) // Era: DIRECTION

@Get()
@Roles(UserRole.ADMIN) // Era: DIRECTION, SUPERVISOR, ADMINISTRATION

@Get(':id')
@Roles(UserRole.ADMIN) // Era: DIRECTION, SUPERVISOR, ADMINISTRATION

@Patch(':id')
@Roles(UserRole.ADMIN) // Era: DIRECTION

@Delete(':id')
@Roles(UserRole.ADMIN) // Era: DIRECTION
```

#### **src/works/works.service.ts** - ACTUALIZAR ROLES
```typescript
// CAMBIAR:
// UserRole.SUPERVISOR → UserRole.OPERATOR
```

---

### 🔵 6. OTROS CONTROLADORES Y SERVICIOS

Necesito actualizar TODOS los archivos que usan los roles antiguos. La lista completa incluye:
- `src/dashboard/dashboard.controller.ts`
- `src/expenses/expenses.controller.ts` y `expenses.service.ts`
- `src/suppliers/suppliers.controller.ts` y `suppliers.service.ts`
- `src/cashboxes/cashboxes.controller.ts` y `cashboxes.service.ts`
- `src/incomes/incomes.controller.ts` y `incomes.service.ts`
- `src/schedule/schedule.controller.ts` y `schedule.service.ts`
- `src/rubrics/rubrics.controller.ts`
- `src/val/val.controller.ts`
- `src/work-budgets/work-budgets.controller.ts`
- `src/supplier-documents/supplier-documents.controller.ts`
- `src/cash-movements/cash-movements.controller.ts`

**Regla de reemplazo:**
- `UserRole.DIRECTION` → `UserRole.ADMIN`
- `UserRole.ADMINISTRATION` → `UserRole.ADMIN`
- `UserRole.SUPERVISOR` → `UserRole.OPERATOR` (donde corresponda lectura/CRUD general)

---

### 🔵 7. VARIABLES DE ENTORNO

#### **env.example** - AGREGAR
```env
# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=1d
JWT_REFRESH_SECRET=your-refresh-token-secret-change-this-in-production
JWT_REFRESH_EXPIRATION=7d
```

---

## 📊 RESUMEN DE CAMBIOS

### Archivos Nuevos (4):
1. `src/common/decorators/current-user.decorator.ts`
2. `src/auth/dto/refresh-token.dto.ts`
3. `src/migrations/1700000000014-MigrateRolesToPMDOfficial.sql` - Script SQL de migración
4. `PMD_BACKEND_SECURITY_COMPLETE_DIFF.md` (este archivo)

### Archivos Modificados (40+):
1. `src/common/enums/user-role.enum.ts` - REESCRIBIR
2. `src/common/guards/roles.guard.ts` - REESCRIBIR
3. `src/common/interceptors/audit.interceptor.ts` - REESCRIBIR
4. `src/common/common.module.ts` - AGREGAR DataSource
5. `src/main.ts` - AGREGAR interceptor global
6. `src/auth/auth.controller.ts` - AGREGAR /me y /refresh
7. `src/auth/auth.service.ts` - AGREGAR métodos y refresh token
8. `src/auth/auth.module.ts` - Verificar configuración
9. `src/seed/default-admin.seed.ts` - REESCRIBIR roles
10. `src/works/works.controller.ts` - ACTUALIZAR roles
11. `src/works/works.service.ts` - ACTUALIZAR roles
12. `src/accounting/accounting.controller.ts` - ACTUALIZAR roles + AGREGAR summary
13. `src/accounting/accounting.service.ts` - ACTUALIZAR roles + AGREGAR getSummary
14. `src/contracts/contracts.controller.ts` - ACTUALIZAR roles
15. `src/contracts/contracts.service.ts` - ACTUALIZAR roles
16. `src/alerts/alerts.controller.ts` - ACTUALIZAR roles
17. `src/alerts/alerts.service.ts` - ACTUALIZAR roles
18. `src/audit/audit.controller.ts` - ACTUALIZAR roles
19. `src/users/users.controller.ts` - ACTUALIZAR roles
20. `src/roles/roles.controller.ts` - ACTUALIZAR roles
21. ... (todos los demás controladores y servicios)

---

## ✅ VALIDACIONES

### ✅ Integridad del Backend:
- ✅ No se eliminan módulos existentes
- ✅ No se modifica lógica de negocio crítica
- ✅ Solo se actualizan roles y se agregan funcionalidades
- ✅ Compatibilidad con frontend mantenida (endpoints no cambian, solo permisos)

### ✅ Esquema TypeORM:
- ⚠️ **IMPORTANTE**: El cambio de enum requiere migración de base de datos
- ⚠️ Los roles existentes en DB deben migrarse manualmente o vía script
- ✅ No se modifican entidades (solo enum)

### ✅ Compatibilidad:
- ✅ Endpoints existentes no cambian de URL
- ✅ Solo cambian los permisos requeridos
- ✅ Guards y decoradores existentes se mantienen (solo se actualiza lógica)

---

## ⚠️ NOTAS IMPORTANTES

1. **Migración de Base de Datos**: El cambio de enum `UserRole` requiere ejecutar el script SQL de migración:
   - **Archivo**: `src/migrations/1700000000014-MigrateRolesToPMDOfficial.sql`
   - **Proceso**:
     1. Normaliza nombres de roles existentes (`administration`, `direction` → `admin`)
     2. Normaliza `supervisor` → `operator`
     3. Crea rol `auditor` si no existe
     4. Reasigna usuarios a los nuevos roles
     5. Verifica que todos los usuarios tengan roles válidos PMD
   - **Ejecutar ANTES de aplicar los cambios de código** o inmediatamente después

2. **Refresh Tokens**: Se implementan usando JWT con secret diferente. No requiere tabla adicional.

3. **AuditInterceptor**: Captura `oldValue` desde DB antes de modificar. Requiere acceso a DataSource.

4. **Roles PMD**: 
   - ADMIN = acceso total (reemplaza ADMINISTRATION + DIRECTION)
   - OPERATOR = CRUD general (reemplaza SUPERVISOR + OPERATOR original)
   - AUDITOR = nuevo rol, solo lectura

5. **Seguridad**: Todos los endpoints protegidos con JwtAuthGuard y RolesGuard según corresponda.

---

## 🔍 CÓMO QUEDARÍAN LOS ROLES

### Antes:
```typescript
enum UserRole {
  DIRECTION = 'direction',
  SUPERVISOR = 'supervisor',
  ADMINISTRATION = 'administration',
  OPERATOR = 'operator',
}
```

### Después:
```typescript
enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  AUDITOR = 'auditor',
}
```

---

## 🔍 CAMBIOS EN RolesGuard

### Antes:
- DIRECTION tenía acceso completo
- Verificaba si el rol estaba en requiredRoles

### Después:
- ADMIN tiene acceso completo
- Verifica si el rol está en requiredRoles
- Eliminada lógica de DIRECTION

---

## 🔍 CAMBIOS EN AuditInterceptor

### Antes:
- Capturaba `oldValue` desde `body` (incorrecto)
- No capturaba estado real desde DB

### Después:
- Captura `oldValue` desde DB usando repositorio correspondiente
- Mapea entity types a repositorios
- Maneja errores sin romper el flujo principal
- Captura correctamente `newValue` desde respuesta

---

## ✅ CONFIRMACIÓN ANTES DE APLICAR

**¿Desea proceder con la aplicación de estos cambios?**

- ✅ No se rompe funcionalidad existente
- ✅ Solo se actualizan roles y se agregan funcionalidades
- ✅ Compatible con frontend actual (endpoints no cambian)
- ✅ Respeta la Regla de Seguridad PMD
- ⚠️ Requiere ejecutar migración SQL: `src/migrations/1700000000014-MigrateRolesToPMDOfficial.sql`

## 📋 ORDEN DE EJECUCIÓN RECOMENDADO

1. **Ejecutar migración SQL** (si la base de datos ya tiene datos):
   ```bash
   psql -U postgres -d pmd_management -f src/migrations/1700000000014-MigrateRolesToPMDOfficial.sql
   ```

2. **Aplicar cambios de código** (según este DIFF)

3. **Verificar** que los roles estén correctamente migrados

**NO APLICAR NADA HASTA QUE LO AUTORICE.**

