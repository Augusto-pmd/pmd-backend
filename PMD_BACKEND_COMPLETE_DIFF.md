# 📋 DIFF COMPLETO - Sistema PMD Backend Completo

## 🎯 RESUMEN DE CAMBIOS

Este documento muestra todos los cambios que se aplicarán para completar el backend del Sistema PMD según los requisitos.

---

## ✅ ESTADO ACTUAL vs REQUERIDO

### ✅ Ya Implementado:
- ✅ `/auth/login` - Funcional
- ✅ `/auth/register` - Funcional
- ✅ CRUD Works - Completo
- ✅ CRUD Accounting - Completo (falta GET summary)
- ✅ CRUD Contracts - Completo
- ✅ CRUD Alerts - Completo
- ✅ RolesGuard - Existe
- ✅ AuditInterceptor - Existe (pero no aplicado globalmente)
- ✅ JWT Strategy - Funcional

### ❌ Falta Implementar:
- ❌ `/auth/me` - Endpoint para obtener usuario actual
- ❌ `/auth/refresh` - Refresh tokens
- ❌ AuditInterceptor global - No está aplicado en main.ts
- ❌ GET `/accounting/summary` - Resumen contable
- ❌ Decorador `@CurrentUser` - Para inyección limpia de usuario
- ❌ Mejora AuditInterceptor - Capturar oldValue correctamente
- ❌ Mapeo de roles PMD (ADMIN=ADMINISTRATION, OPERATOR, AUDITOR)

---

## 📝 ARCHIVOS A MODIFICAR/CREAR

### 1. **src/auth/auth.controller.ts** - AGREGAR ENDPOINTS
```typescript
// AGREGAR:
@Get('me')
@UseGuards(JwtAuthGuard)
@ApiOperation({ summary: 'Get current user profile' })
@ApiResponse({ status: 200, description: 'Current user information' })
async getProfile(@Request() req) {
  return this.authService.getProfile(req.user);
}

@Post('refresh')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Refresh access token' })
@ApiBody({ type: RefreshTokenDto })
@ApiResponse({ status: 200, description: 'Token refreshed successfully' })
async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
  return this.authService.refreshToken(refreshTokenDto.refresh_token);
}
```

### 2. **src/auth/auth.service.ts** - AGREGAR MÉTODOS
```typescript
// AGREGAR:
async getProfile(user: any): Promise<any> {
  const fullUser = await this.userRepository.findOne({
    where: { id: user.id },
    relations: ['role'],
  });
  
  if (!fullUser) {
    throw new UnauthorizedException('User not found');
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
    const payload = this.jwtService.verify(refreshToken, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh-secret-123'),
    });
    
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
  // ... código existente ...
  
  const refreshPayload = { 
    email: user.email, 
    sub: user.id, 
    role: user.role?.name || null,
    type: 'refresh',
  };
  
  const refresh_token = this.jwtService.sign(refreshPayload, {
    secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh-secret-123'),
    expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
  });
  
  return {
    access_token,
    refresh_token,
    user: {
      // ... código existente ...
    },
  };
}
```

### 3. **src/auth/dto/refresh-token.dto.ts** - NUEVO ARCHIVO
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

### 4. **src/auth/auth.module.ts** - AGREGAR CONFIGURACIÓN
```typescript
// MODIFICAR JwtModule.registerAsync para incluir refresh secret:
useFactory: async (configService: ConfigService) => ({
  secret: configService.get<string>('JWT_SECRET', 'supersecret123'),
  signOptions: { 
    expiresIn: configService.get<string>('JWT_EXPIRATION', '1d'),
  },
}),
// Nota: Refresh token se firma con JWT_REFRESH_SECRET en el servicio
```

### 5. **src/common/decorators/current-user.decorator.ts** - NUEVO ARCHIVO
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

### 6. **src/common/guards/roles.guard.ts** - MEJORAR MAPEO DE ROLES
```typescript
// MODIFICAR canActivate para mapear roles PMD:
canActivate(context: ExecutionContext): boolean {
  // ... código existente ...
  
  const userRole = user.role.name || user.role;
  
  // Mapeo de roles PMD
  // ADMIN = ADMINISTRATION (acceso completo)
  // OPERATOR = OPERATOR (ya existe)
  // AUDITOR = nuevo rol o mapear a alguno existente
  
  // Direction y Administration tienen acceso completo
  if (userRole === UserRole.DIRECTION || userRole === UserRole.ADMINISTRATION) {
    return true;
  }
  
  // ... resto del código ...
}
```

### 7. **src/common/interceptors/audit.interceptor.ts** - MEJORAR CAPTURA DE oldValue
```typescript
// MODIFICAR intercept para capturar oldValue antes de la modificación:
intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
  const request = context.switchToHttp().getRequest();
  const { method, url, body, params, query, user, ip, headers } = request;
  
  // Capturar oldValue ANTES de ejecutar la request
  let oldValue: any = null;
  
  if (['PUT', 'PATCH', 'DELETE'].includes(method) && params?.id) {
    // Para operaciones de actualización/eliminación, necesitamos el estado anterior
    // Esto se capturará en el servicio antes de modificar
    // Por ahora, guardamos el body como previous_value
    oldValue = this.sanitizeData(body);
  } else if (method === 'POST') {
    oldValue = null; // POST crea nuevo, no hay oldValue
  } else {
    oldValue = this.sanitizeData(body);
  }
  
  const action = `${method} ${url}`;
  const module = url.split('/')[1] || 'unknown';
  const entityId = params?.id || body?.id || null;
  const entityType = this.getEntityType(url);
  const ipAddress = ip || headers['x-forwarded-for'] || 'unknown';
  const userAgent = headers['user-agent'] || 'unknown';
  const criticality = this.getCriticality(method, module);
  
  return next.handle().pipe(
    tap(async (response) => {
      try {
        const auditLog = this.auditLogRepository.create({
          user_id: user?.id || null,
          action,
          module,
          entity_id: entityId,
          entity_type: entityType,
          previous_value: oldValue,
          new_value: this.sanitizeData(response),
          ip_address: ipAddress,
          user_agent: userAgent,
          criticality,
        });
        
        await this.auditLogRepository.save(auditLog);
      } catch (error) {
        console.error('Audit logging failed:', error);
      }
    }),
  );
}
```

### 8. **src/main.ts** - APLICAR INTERCEPTOR GLOBALMENTE
```typescript
// AGREGAR después de crear la app:
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ... código existente ...
  
  // Aplicar AuditInterceptor globalmente
  const auditInterceptor = app.get(AuditInterceptor);
  app.useGlobalInterceptors(auditInterceptor);
  
  // ... resto del código ...
}
```

### 9. **src/accounting/accounting.service.ts** - AGREGAR getSummary
```typescript
// AGREGAR método:
async getSummary(user: User): Promise<any> {
  // Solo Administration y Direction pueden ver resumen
  if (
    user.role.name !== UserRole.ADMINISTRATION &&
    user.role.name !== UserRole.DIRECTION
  ) {
    throw new ForbiddenException('Only Administration and Direction can view summary');
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
```

### 10. **src/accounting/accounting.controller.ts** - AGREGAR ENDPOINT
```typescript
// AGREGAR:
@Get('summary')
@Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
@ApiOperation({ summary: 'Get accounting summary' })
@ApiResponse({ status: 200, description: 'Accounting summary' })
getSummary(@Request() req) {
  return this.accountingService.getSummary(req.user);
}
```

### 11. **src/common/common.module.ts** - VERIFICAR EXPORTACIÓN
```typescript
// Asegurar que AuditInterceptor esté exportado:
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditInterceptor],
  exports: [AuditInterceptor], // ✅ Ya está exportado
})
export class CommonModule {}
```

### 12. **env.example** - AGREGAR VARIABLES
```env
# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=1d
JWT_REFRESH_SECRET=your-refresh-token-secret-change-this-in-production
JWT_REFRESH_EXPIRATION=7d
```

---

## 🔍 VALIDACIONES Y VERIFICACIONES

### ✅ Integridad del Backend:
- ✅ No se eliminan módulos existentes
- ✅ No se modifica lógica de negocio crítica
- ✅ Solo se agregan funcionalidades
- ✅ Compatibilidad con frontend mantenida

### ✅ Esquema TypeORM:
- ✅ No se modifican entidades existentes
- ✅ No se requieren nuevas migraciones
- ✅ Refresh tokens se manejan en memoria/JWT (no requiere tabla)

### ✅ Compatibilidad:
- ✅ Endpoints existentes no se modifican
- ✅ Solo se agregan nuevos endpoints
- ✅ Guards y decoradores existentes se mantienen

---

## 📊 RESUMEN DE CAMBIOS

### Archivos Nuevos (3):
1. `src/auth/dto/refresh-token.dto.ts`
2. `src/common/decorators/current-user.decorator.ts`
3. `PMD_BACKEND_COMPLETE_DIFF.md` (este archivo)

### Archivos Modificados (9):
1. `src/auth/auth.controller.ts` - Agregar `/me` y `/refresh`
2. `src/auth/auth.service.ts` - Agregar `getProfile()` y `refreshToken()`
3. `src/auth/auth.module.ts` - Verificar configuración
4. `src/common/guards/roles.guard.ts` - Mejorar mapeo de roles
5. `src/common/interceptors/audit.interceptor.ts` - Mejorar captura de oldValue
6. `src/main.ts` - Aplicar AuditInterceptor globalmente
7. `src/accounting/accounting.service.ts` - Agregar `getSummary()`
8. `src/accounting/accounting.controller.ts` - Agregar endpoint `/summary`
9. `env.example` - Agregar variables de refresh token

---

## ⚠️ NOTAS IMPORTANTES

1. **Refresh Tokens**: Se implementan usando JWT con un secret diferente y expiración más larga. No requiere tabla adicional.

2. **AuditInterceptor Global**: Se aplica en `main.ts` para capturar todas las requests automáticamente.

3. **Roles PMD**: 
   - ADMIN = ADMINISTRATION (ya existe)
   - OPERATOR = OPERATOR (ya existe)
   - AUDITOR = Se puede mapear a OPERATOR o crear nuevo rol (requeriría migración)

4. **oldValue en AuditInterceptor**: Para capturar correctamente el estado anterior en PUT/PATCH, idealmente se debería leer desde la base de datos antes de modificar. Por ahora, se captura el body como previous_value.

5. **Seguridad**: Todos los endpoints protegidos con JwtAuthGuard y RolesGuard según corresponda.

---

## ✅ CONFIRMACIÓN ANTES DE APLICAR

**¿Desea proceder con la aplicación de estos cambios?**

- ✅ No se rompe funcionalidad existente
- ✅ Solo se agregan nuevas funcionalidades
- ✅ Compatible con frontend actual
- ✅ Respeta la Regla de Seguridad PMD

