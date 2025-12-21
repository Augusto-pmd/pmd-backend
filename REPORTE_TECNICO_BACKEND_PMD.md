# 📋 REPORTE TÉCNICO EXHAUSTIVO - BACKEND NESTJS PMD

**Fecha:** 2025-01-XX  
**Objetivo:** Análisis completo del backend sin modificaciones  
**Estado:** Sistema en producción - Auth cerrado - No modificar

---

## 1. ARQUITECTURA GENERAL DEL BACKEND

### 1.1 Stack Tecnológico

- **Framework:** NestJS (Express adapter por defecto)
- **ORM:** TypeORM con PostgreSQL
- **Autenticación:** JWT (Passport Strategy)
- **Validación:** class-validator + class-transformer
- **Documentación:** Swagger/OpenAPI
- **Deployment:** Render (puerto 10000 o PORT env)

### 1.2 Estructura de Carpetas (`src/`)

```
src/
├── accounting/          ✅ Módulo completo
├── alerts/              ✅ Módulo completo
├── auth/                ✅ Módulo completo (CERRADO - NO TOCAR)
├── cash-movements/      ✅ Módulo completo
├── cashboxes/           ✅ Módulo completo
├── common/              ✅ Módulos compartidos
│   ├── decorators/      ✅ Decorators custom
│   ├── enums/           ✅ 17 enums del sistema
│   ├── filters/         ✅ Exception filters
│   ├── guards/          ✅ JWT + Roles guards
│   ├── helpers/         ✅ Helper functions
│   ├── interceptors/    ✅ Audit interceptor
│   └── pipes/           ✅ Validation pipes
├── config/              ✅ Configuración
├── contracts/           ✅ Módulo completo
├── dashboard/           ✅ Módulo completo
├── debug/               ⚠️  Módulo debug (desarrollo)
├── expenses/            ✅ Módulo completo
├── health/              ✅ Health check
├── incomes/             ✅ Módulo completo
├── organizations/       ⚠️  Solo entidad (sin módulo)
├── roles/               ✅ Módulo completo
├── rubrics/             ✅ Módulo completo
├── schedule/            ✅ Módulo completo
├── seed/                ⚠️  Seeding (probablemente)
├── storage/             ✅ Módulo storage
├── supplier-documents/  ✅ Módulo completo
├── suppliers/           ✅ Módulo completo
├── tasks/               ⚠️  Módulo (revisar)
├── users/               ✅ Módulo completo
├── val/                 ✅ Módulo completo
├── work-budgets/        ✅ Módulo completo
├── work-documents/      ✅ Módulo completo
├── works/               ✅ Módulo completo
├── admin-reset.module.ts    ⚠️  Módulo admin tools
├── app.module.ts            ✅ Root module
└── main.ts                  ✅ Bootstrap
```

### 1.3 AppModule - Módulos Importados

**Total: 28 módulos importados en `app.module.ts`**

1. ✅ `CommonModule` - Módulos compartidos
2. ✅ `AuthModule` - Autenticación (CERRADO)
3. ✅ `UsersModule` - Gestión de usuarios
4. ✅ `RolesModule` - Gestión de roles
5. ✅ `SuppliersModule` - Proveedores
6. ✅ `SupplierDocumentsModule` - Documentos de proveedores
7. ✅ `WorksModule` - Obras/Proyectos
8. ✅ `WorkBudgetsModule` - Presupuestos de obras
9. ✅ `WorkDocumentsModule` - Documentos de obras
10. ✅ `ContractsModule` - Contratos
11. ✅ `RubricsModule` - Rúbricas/Categorías
12. ✅ `ExpensesModule` - Gastos
13. ✅ `ValModule` - Documentos VAL
14. ✅ `IncomesModule` - Ingresos
15. ✅ `CashboxesModule` - Cajas
16. ✅ `CashMovementsModule` - Movimientos de caja
17. ✅ `ScheduleModule` - Cronograma/Gantt
18. ✅ `AlertsModule` - Alertas
19. ✅ `AccountingModule` - Contabilidad
20. ✅ `AuditModule` - Auditoría
21. ✅ `DashboardModule` - Dashboard
22. ✅ `TasksModule` - Tareas
23. ✅ `StorageModule` - Almacenamiento
24. ✅ `AdminResetModule` - Admin tools
25. ✅ `DebugModule` - Debug (desarrollo)
26. ✅ `HealthModule` - Health check

**Módulos activos vs inexistentes:**
- ✅ **Todos los módulos listados existen y están activos**
- ⚠️  **Organizations:** Solo tiene entidad, NO tiene módulo completo (sin controller/service)
- ⚠️  **Tasks:** Existe módulo pero necesita verificación de funcionalidad

---

## 2. AUTH Y SEGURIDAD (SOLO LECTURA - NO MODIFICAR)

### 2.1 Módulos que Implementan Auth

**AuthModule** (`src/auth/`)
- **Ubicación:** `src/auth/auth.module.ts`
- **Controllers:** `AuthController`, `AuthBootstrapController`
- **Services:** `AuthService`
- **Strategies:** `JwtStrategy` (Passport JWT)
- **Estado:** ✅ CERRADO - NO MODIFICAR

### 2.2 Guards Existentes

#### 2.2.1 JwtAuthGuard
- **Ubicación:** `src/common/guards/jwt-auth.guard.ts`
- **Tipo:** Extiende `AuthGuard('jwt')` de Passport
- **Función:** Valida JWT token en `Authorization: Bearer <token>`
- **Uso:** Aplicado a nivel controller o endpoint

#### 2.2.2 RolesGuard
- **Ubicación:** `src/common/guards/roles.guard.ts`
- **Tipo:** `CanActivate` custom
- **Función:** 
  - Verifica roles del usuario autenticado
  - `DIRECTION` tiene acceso total (bypass)
  - Compara `user.role.name` con roles requeridos
  - Lanza `ForbiddenException` si no tiene permisos

**Uso típico:**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DIRECTION, UserRole.SUPERVISOR)
```

### 2.3 Inyección de req.user

**Proceso:**
1. `JwtStrategy.validate()` se ejecuta después de validar JWT
2. Carga usuario completo de DB con `role` y `organization`
3. Retorna objeto user normalizado que se inyecta en `req.user`

**Formato de `req.user`:**
```typescript
{
  id: string;                    // UUID del usuario
  email: string;
  fullName: string;
  role: string;                  // Nombre del rol (ej: 'direction')
  organizationId: string | null;
  organization: { id, name } | null;
}
```

**Acceso en controllers:**
```typescript
@Get()
findAll(@Request() req) {
  const user = req.user;  // Usuario autenticado
  return this.service.findAll(req.user);
}
```

### 2.4 Decorators Custom

#### 2.4.1 @Roles()
- **Ubicación:** `src/common/decorators/roles.decorator.ts`
- **Uso:** `@Roles(UserRole.DIRECTION, UserRole.SUPERVISOR)`
- **Función:** Define roles requeridos para el endpoint
- **Metadata key:** `ROLES_KEY = 'roles'`
- **Usado por:** `RolesGuard` para verificar permisos

### 2.5 JWT Strategy - Validación

**Ubicación:** `src/auth/strategies/jwt.strategy.ts`

**Proceso:**
1. Extrae JWT de `Authorization: Bearer <token>`
2. Decodifica payload
3. Busca usuario en DB por `payload.sub` (user.id)
4. Verifica que usuario esté activo (`isActive === true`)
5. Retorna objeto user normalizado

**Payload JWT:**
```typescript
{
  sub: string;      // User ID
  email: string;
  role: string;     // Role name
}
```

### 2.6 ⚠️ QUÉ NO DEBE TOCARSE

**ARCHIVOS PROHIBIDOS:**
- `src/auth/auth.module.ts`
- `src/auth/auth.service.ts`
- `src/auth/auth.controller.ts`
- `src/auth/strategies/jwt.strategy.ts`
- `src/common/guards/jwt-auth.guard.ts`
- `src/common/guards/roles.guard.ts`
- `src/common/decorators/roles.decorator.ts`

**FUNCIONALIDAD PROHIBIDA:**
- Login flow (`POST /api/auth/login`)
- JWT generation
- User authentication logic
- Guard logic
- Role verification logic

---

## 3. ENTIDADES Y BASE DE DATOS

### 3.1 Entidades TypeORM (21 entidades)

**Tabla: `users`**
- **Entidad:** `User` (`src/users/user.entity.ts`)
- **Primary Key:** `id` (UUID)
- **Campos clave:**
  - `id: uuid`
  - `email: string` (unique)
  - `password: string` (hashed)
  - `fullName: string`
  - `isActive: boolean` (default: true)
  - `role_id: uuid` → `Role`
  - `organization_id: uuid | null` → `Organization`
  - `created_at: Date`
  - `updated_at: Date`
- **Relaciones:**
  - `@ManyToOne` → `Role` (eager: true)
  - `@ManyToOne` → `Organization` (nullable)

**Tabla: `roles`**
- **Entidad:** `Role` (`src/roles/role.entity.ts`)
- **Primary Key:** `id` (UUID)
- **Campos clave:**
  - `id: uuid`
  - `name: UserRole enum` (unique)
  - `description: string | null`
  - `permissions: jsonb | null`
  - `created_at: Date`
  - `updated_at: Date`
- **Enums:** `UserRole` (direction, supervisor, administration, operator)

**Tabla: `organizations`**
- **Entidad:** `Organization` (`src/organizations/organization.entity.ts`)
- **Primary Key:** `id` (UUID)
- **Campos clave:**
  - `id: uuid`
  - `name: string`
  - `description: string | null`
  - `created_at: Date`
  - `updated_at: Date`

**Tabla: `works`**
- **Entidad:** `Work` (`src/works/works.entity.ts`)
- **Primary Key:** `id` (UUID)
- **Campos clave:**
  - `id: uuid`
  - `name: string`
  - `client: string`
  - `address: text`
  - `start_date: date`
  - `end_date: date | null`
  - `status: WorkStatus enum`
  - `currency: Currency enum`
  - `supervisor_id: uuid | null` → `User`
  - `organization_id: uuid | null` → `Organization`
  - `total_budget: decimal(15,2)`
  - `total_expenses: decimal(15,2)`
  - `total_incomes: decimal(15,2)`
  - `physical_progress: decimal(5,2)`
  - `economic_progress: decimal(5,2)`
  - `financial_progress: decimal(5,2)`
  - `created_at: Date`
  - `updated_at: Date`
- **Relaciones:**
  - `@ManyToOne` → `User` (supervisor)
  - `@ManyToOne` → `Organization`
  - `@OneToMany` → `WorkBudget`
  - `@OneToMany` → `Contract`
  - `@OneToMany` → `Expense`
  - `@OneToMany` → `Income`
  - `@OneToMany` → `Schedule`
  - `@OneToMany` → `WorkDocument`

**Otras entidades principales:**
- `suppliers` → `Supplier`
- `contracts` → `Contract`
- `expenses` → `Expense`
- `incomes` → `Income`
- `cashboxes` → `Cashbox`
- `cash_movements` → `CashMovement`
- `rubrics` → `Rubric`
- `work_budgets` → `WorkBudget`
- `work_documents` → `WorkDocument`
- `supplier_documents` → `SupplierDocument`
- `val` → `Val`
- `schedule` → `Schedule`
- `alerts` → `Alert`
- `accounting_records` → `AccountingRecord`
- `audit_logs` → `AuditLog`

### 3.2 Relaciones Clave Entre Entidades

```
User
├── role_id → Role
├── organization_id → Organization
└── supervisor_id → User (en Works)

Work
├── supervisor_id → User
├── organization_id → Organization
├── budgets → WorkBudget[]
├── contracts → Contract[]
├── expenses → Expense[]
├── incomes → Income[]
├── schedules → Schedule[]
└── documents → WorkDocument[]

Organization
└── users → User[]
```

### 3.3 Campos Clave del Sistema

**Identificadores:**
- `id`: UUID en todas las entidades
- `organization_id`: Filtro multi-tenancy (nullable)
- `role_id`: Asignación de roles

**Timestamps:**
- ✅ Todas las entidades tienen `created_at` y `updated_at`
- Uso de `@CreateDateColumn()` y `@UpdateDateColumn()`

**Soft Delete:**
- ❌ NO se usa soft delete
- Se usa `remove()` que elimina físicamente

**Enums:**
- `UserRole`: direction, supervisor, administration, operator
- `WorkStatus`: Active, Completed, Cancelled, etc.
- `Currency`: USD, EUR, ARS, etc.
- `ExpenseState`: Pending, Validated, Observed
- Y otros 13 enums más en `src/common/enums/`

### 3.4 Configuración TypeORM

**Ubicación:** `src/app.module.ts`

```typescript
TypeOrmModule.forRoot({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  autoLoadEntities: true,  // ✅ Carga automática de entidades
  synchronize: false,       // ✅ Usa migraciones
  ssl: {
    rejectUnauthorized: false
  }
})
```

**Migrations:** `src/migrations/` (14 migraciones TypeScript + 1 SQL)

---

## 4. USUARIOS (CRÍTICO)

### 4.1 Estado del Módulo Users

**✅ MÓDULO USERS EXISTE Y ESTÁ COMPLETO**

**Estructura:**
```
src/users/
├── user.entity.ts          ✅ Entidad User
├── users.entity.ts         ⚠️  Archivo adicional (verificar)
├── users.module.ts         ✅ Módulo NestJS
├── users.controller.ts     ✅ Controller completo
├── users.service.ts        ✅ Service completo
├── users.service.spec.ts   ✅ Tests
└── dto/
    ├── create-user.dto.ts  ✅ DTO creación
    └── update-user.dto.ts  ✅ DTO actualización
```

### 4.2 Controller de Users

**Ubicación:** `src/users/users.controller.ts`

**Ruta base:** `/api/users` (con `app.setGlobalPrefix('api')`)

**Endpoints:**
- ✅ `POST /api/users` - Crear usuario
- ✅ `GET /api/users` - Listar usuarios
- ✅ `GET /api/users/me` - Usuario actual
- ✅ `GET /api/users/:id` - Obtener por ID
- ✅ `PATCH /api/users/:id` - Actualizar usuario
- ✅ `PATCH /api/users/:id/role` - Actualizar rol
- ✅ `DELETE /api/users/:id` - Eliminar usuario

**Guards aplicados:**
- `@UseGuards(JwtAuthGuard, RolesGuard)` a nivel controller
- Roles específicos por endpoint

### 4.3 Service de Users

**Ubicación:** `src/users/users.service.ts`

**Métodos principales:**
- `create(dto, user?)` - Crea usuario con password hasheado
- `findAll(user?)` - Lista usuarios (filtrado por organización)
- `findOne(id)` - Busca por ID
- `update(id, dto)` - Actualiza usuario
- `remove(id)` - Elimina usuario
- `updateRole(id, roleId)` - Actualiza rol

**Normalización:**
- Usa `normalizeUser()` helper para serialización consistente
- Siempre retorna formato normalizado

### 4.4 Entidad que Representa Usuarios

**Entidad:** `User` (`src/users/user.entity.ts`)

**Tabla:** `users`

**Campos principales:**
```typescript
{
  id: string;                    // UUID
  email: string;                 // Unique
  password: string;              // Hashed con bcrypt
  fullName: string;
  isActive: boolean;
  role: Role;                    // ManyToOne (eager)
  organization: Organization;    // ManyToOne (nullable)
  organizationId: string | null;
  created_at: Date;
  updated_at: Date;
}
```

### 4.5 Acceso al Usuario Autenticado

**Desde controllers:**
```typescript
@Get()
findAll(@Request() req) {
  const user = req.user;  // Usuario del JWT
  return this.service.findAll(req.user);
}
```

**Desde JWT Strategy:**
- Se inyecta automáticamente en `req.user` después de validar JWT
- Formato normalizado (no es la entidad completa)

**Helper para obtener organizationId:**
- `getOrganizationId(user)` - Extrae organizationId de user

---

## 5. ENDPOINTS EXISTENTES

### 5.1 Prefijo Global

**Prefijo:** `/api` (configurado en `main.ts`)

### 5.2 Listado Completo de Endpoints

#### 🔐 Auth (NO MODIFICAR)

**Base:** `/api/auth`

- ✅ `POST /api/auth/login` - Login (email + password)
- ✅ `GET /api/auth/me` - Usuario actual (JWT)
- ✅ `GET /api/auth/refresh` - Refresh token
- ✅ `POST /api/auth/register` - Registro

#### 👥 Users

**Base:** `/api/users`  
**Guards:** `JwtAuthGuard`, `RolesGuard`

- ✅ `POST /api/users` - Crear usuario (DIRECTION)
- ✅ `GET /api/users` - Listar usuarios (DIRECTION, SUPERVISOR, ADMINISTRATION)
- ✅ `GET /api/users/me` - Usuario actual (todos los roles)
- ✅ `GET /api/users/:id` - Obtener por ID (DIRECTION, SUPERVISOR, ADMINISTRATION)
- ✅ `PATCH /api/users/:id` - Actualizar (DIRECTION)
- ✅ `PATCH /api/users/:id/role` - Actualizar rol (DIRECTION)
- ✅ `DELETE /api/users/:id` - Eliminar (DIRECTION)

#### 🏗️ Works

**Base:** `/api/works`  
**Guards:** `JwtAuthGuard`, `RolesGuard`

- ✅ `POST /api/works` - Crear obra (DIRECTION)
- ✅ `GET /api/works` - Listar obras (SUPERVISOR, ADMINISTRATION, DIRECTION)
- ✅ `GET /api/works/:id` - Obtener por ID (SUPERVISOR, ADMINISTRATION, DIRECTION, OPERATOR)
- ✅ `PATCH /api/works/:id` - Actualizar (DIRECTION, SUPERVISOR)
- ✅ `DELETE /api/works/:id` - Eliminar (DIRECTION)

#### 💰 Expenses

**Base:** `/api/expenses`  
**Guards:** `JwtAuthGuard`, `RolesGuard`

- ✅ `POST /api/expenses` - Crear gasto (OPERATOR, ADMINISTRATION, DIRECTION)
- ✅ `GET /api/expenses` - Listar gastos (OPERATOR, SUPERVISOR, ADMINISTRATION, DIRECTION)
- ✅ `GET /api/expenses/:id` - Obtener por ID (OPERATOR, SUPERVISOR, ADMINISTRATION, DIRECTION)
- ✅ `PATCH /api/expenses/:id` - Actualizar (OPERATOR, ADMINISTRATION, DIRECTION)
- ✅ `POST /api/expenses/:id/validate` - Validar gasto (ADMINISTRATION, DIRECTION)
- ✅ `DELETE /api/expenses/:id` - Eliminar (DIRECTION)

#### 💵 Incomes

**Base:** `/api/incomes`  
**Guards:** `JwtAuthGuard`, `RolesGuard`

- ✅ `POST /api/incomes` - Crear ingreso (ADMINISTRATION, DIRECTION)
- ✅ `GET /api/incomes` - Listar ingresos (SUPERVISOR, ADMINISTRATION, DIRECTION)
- ✅ `GET /api/incomes/:id` - Obtener por ID (SUPERVISOR, ADMINISTRATION, DIRECTION)
- ✅ `PATCH /api/incomes/:id` - Actualizar (ADMINISTRATION, DIRECTION)
- ✅ `DELETE /api/incomes/:id` - Eliminar (DIRECTION)

#### 📄 Contracts

**Base:** `/api/contracts`  
**Guards:** `JwtAuthGuard`, `RolesGuard`

- ✅ `POST /api/contracts` - Crear contrato (ADMINISTRATION, DIRECTION)
- ✅ `GET /api/contracts` - Listar contratos (SUPERVISOR, ADMINISTRATION, DIRECTION)
- ✅ `GET /api/contracts/:id` - Obtener por ID (SUPERVISOR, ADMINISTRATION, DIRECTION)
- ✅ `PATCH /api/contracts/:id` - Actualizar (ADMINISTRATION, DIRECTION)
- ✅ `DELETE /api/contracts/:id` - Eliminar (DIRECTION)

#### 🏢 Suppliers

**Base:** `/api/suppliers`  
**Guards:** `JwtAuthGuard`, `RolesGuard`

- ✅ `POST /api/suppliers` - Crear proveedor (OPERATOR, ADMINISTRATION, DIRECTION)
- ✅ `GET /api/suppliers` - Listar proveedores (OPERATOR, SUPERVISOR, ADMINISTRATION, DIRECTION)
- ✅ `GET /api/suppliers/:id` - Obtener por ID (OPERATOR, SUPERVISOR, ADMINISTRATION, DIRECTION)
- ✅ `PATCH /api/suppliers/:id` - Actualizar (OPERATOR, ADMINISTRATION, DIRECTION)
- ✅ `DELETE /api/suppliers/:id` - Eliminar (DIRECTION)

#### Otros Módulos Activos

**Roles:**
- ✅ `/api/roles` - CRUD completo

**Rubrics:**
- ✅ `/api/rubrics` - CRUD completo

**Cashboxes:**
- ✅ `/api/cashboxes` - CRUD completo

**Cash Movements:**
- ✅ `/api/cash-movements` - CRUD completo

**Work Budgets:**
- ✅ `/api/work-budgets` - CRUD completo

**Work Documents:**
- ✅ `/api/work-documents` - CRUD completo

**Supplier Documents:**
- ✅ `/api/supplier-documents` - CRUD completo

**VAL:**
- ✅ `/api/val` - CRUD completo

**Schedule:**
- ✅ `/api/schedule` - CRUD completo

**Alerts:**
- ✅ `/api/alerts` - CRUD completo

**Accounting:**
- ✅ `/api/accounting` - CRUD completo

**Audit:**
- ✅ `/api/audit` - Lectura de logs

**Dashboard:**
- ✅ `/api/dashboard` - Métricas y estadísticas

**Health:**
- ✅ `/api/health` - Health check (sin auth)

**Admin Tools:**
- ⚠️  `/api/admin-tools` - Herramientas admin

### 5.3 Endpoints que NO Existen

**❌ Organizations:**
- NO existe `/api/organizations`
- Solo existe la entidad, no el módulo completo

**⚠️ Tasks:**
- Existe módulo pero necesita verificación de endpoints

### 5.4 Patrón de Guards

**Patrón estándar:**
```typescript
@Controller('resource')
@UseGuards(JwtAuthGuard, RolesGuard)  // A nivel controller
export class ResourceController {
  @Get()
  @Roles(UserRole.DIRECTION, UserRole.SUPERVISOR)  // Por endpoint
  findAll(@Request() req) {
    return this.service.findAll(req.user);
  }
}
```

**Excepciones:**
- `/api/health` - Sin guards
- `/api/auth/login` y `/api/auth/register` - Sin guards
- Algunos endpoints de auth - Solo `JwtAuthGuard`

---

## 6. DTOs Y SERIALIZACIÓN

### 6.1 Convención de DTOs

**Estructura:**
- DTOs en carpeta `dto/` dentro de cada módulo
- Naming: `CreateXxxDto`, `UpdateXxxDto`, `ValidateXxxDto` (si aplica)

**Ejemplo:**
```typescript
// src/users/dto/create-user.dto.ts
export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  role_id: string;
}
```

### 6.2 Validación

**Uso de class-validator:**
- `@IsString()`, `@IsEmail()`, `@IsUUID()`, `@IsOptional()`
- `@MinLength()`, `@MaxLength()`
- `@IsBoolean()`, `@IsNumber()`, etc.

**Global ValidationPipe:**
```typescript
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // ✅ Solo propiedades permitidas
    forbidNonWhitelisted: true,   // ✅ Rechaza propiedades extra
    transform: true,              // ✅ Transforma tipos
  }),
);
```

### 6.3 Serialización

**Convención de naming:**
- **Base de datos:** `snake_case` (created_at, organization_id)
- **JavaScript/TypeScript:** `camelCase` en DTOs y responses
- **TypeORM:** Maneja conversión automática

**Normalización de User:**
- Helper `normalizeUser()` en `src/common/helpers/normalize-user.helper.ts`
- Asegura formato consistente en todos los endpoints
- Estructura:
  ```typescript
  {
    id: string;
    email: string;
    fullName: string;
    isActive: boolean;
    role: { id, name, description?, permissions? } | null;
    roleId: string | null;
    organizationId: string | null;
    organization: { id, name } | null;
    created_at?: Date;
    updated_at?: Date;
  }
  ```

**class-transformer:**
- Se usa implícitamente por NestJS
- No se usa `@Exclude()` explícitamente en la mayoría de casos
- Las respuestas son objetos planos serializados automáticamente

### 6.4 Swagger/OpenAPI

**Configuración:**
- Documentación en `/api/docs`
- `@ApiTags()` en controllers
- `@ApiOperation()`, `@ApiResponse()`, `@ApiParam()`, `@ApiBody()` en endpoints
- `@ApiProperty()` y `@ApiPropertyOptional()` en DTOs
- `@ApiBearerAuth('JWT-auth')` para endpoints protegidos

---

## 7. CONVENCIONES DEL PROYECTO

### 7.1 Patrón de Módulos

**Estructura estándar:**
```
module-name/
├── module-name.module.ts       # Módulo NestJS
├── module-name.controller.ts   # Controller
├── module-name.service.ts      # Service
├── module-name.entity.ts       # Entidad TypeORM
├── module-name.service.spec.ts # Tests (opcional)
└── dto/
    ├── create-module-name.dto.ts
    └── update-module-name.dto.ts
```

**Module template:**
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Entity, RelatedEntity])],
  controllers: [ResourceController],
  providers: [ResourceService],
  exports: [ResourceService],  // Si se usa en otros módulos
})
export class ResourceModule {}
```

### 7.2 Naming Conventions

**Archivos:**
- Entities: `xxx.entity.ts` o `xxxs.entity.ts`
- Controllers: `xxxs.controller.ts` (plural)
- Services: `xxxs.service.ts` (plural)
- DTOs: `create-xxx.dto.ts`, `update-xxx.dto.ts`
- Modules: `xxxs.module.ts` (plural)

**Clases:**
- Entities: Singular (`User`, `Work`, `Expense`)
- Controllers: Plural (`UsersController`, `WorksController`)
- Services: Plural (`UsersService`, `WorksService`)
- DTOs: `CreateUserDto`, `UpdateUserDto`

**Rutas:**
- Plural en controllers: `@Controller('users')`
- Con prefijo `/api` desde `main.ts`

### 7.3 Manejo de Errores

**Exceptions estándar:**
- `NotFoundException` - Recurso no encontrado
- `ForbiddenException` - Sin permisos
- `UnauthorizedException` - No autenticado
- `ConflictException` - Conflicto (ej: email duplicado)
- `BadRequestException` - Validación fallida (automático por ValidationPipe)

**Global Exception Filter:**
- Ubicación: `src/common/filters/http-exception.filter.ts`
- Formato estándar de respuesta de error

### 7.4 Responses Estándar

**Éxito:**
- Retorna directamente el objeto o array
- Sin wrapper adicional
- Status codes estándar (200, 201, 204)

**Ejemplo:**
```typescript
// Controller
@Get()
findAll() {
  return this.service.findAll();  // Retorna array directamente
}

// Service retorna
return users.map(u => normalizeUser(u));  // Array normalizado
```

**Errores:**
```typescript
{
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | object;
}
```

### 7.5 Logging

**No se observa logging estructurado explícito:**
- No se usa `Logger` de NestJS extensivamente
- Solo `console.log` en algunos lugares
- No hay interceptor de logging global

### 7.6 Helpers Comunes

**Ubicación:** `src/common/helpers/`

1. **`normalize-user.helper.ts`**
   - Normaliza entidad User a formato API consistente
   - Usado en todos los endpoints que retornan usuarios

2. **`get-organization-id.helper.ts`**
   - Extrae `organizationId` de objeto user
   - Maneja ambos formatos: JWT payload y DB entity

3. **`get-default-role.helper.ts`**
   - Obtiene rol por defecto (probablemente)

### 7.7 Multi-tenancy (Organizaciones)

**Patrón:**
- Filtrado por `organization_id` en queries
- Uso de `getOrganizationId(user)` helper
- Los servicios reciben `req.user` y filtran automáticamente

**Ejemplo:**
```typescript
async findAll(user: User) {
  const organizationId = getOrganizationId(user);
  const where: any = {};
  
  if (organizationId) {
    where.organization_id = organizationId;
  }
  
  return this.repository.find({ where });
}
```

### 7.8 Roles y Permisos

**Roles disponibles:**
- `DIRECTION` - Acceso total (bypass en RolesGuard)
- `SUPERVISOR` - Supervisión de obras
- `ADMINISTRATION` - Administración
- `OPERATOR` - Operador básico

**Lógica de permisos:**
- `RolesGuard` verifica roles
- `DIRECTION` siempre tiene acceso
- Otros roles se comparan con roles requeridos del decorator `@Roles()`

---

## 8. RIESGOS Y DEPENDENCIAS AL CREAR MÓDULOS NUEVOS

### 8.1 Dependencias Críticas

**Auth (NO TOCAR):**
- Todos los módulos nuevos deben usar `JwtAuthGuard` y `RolesGuard`
- Acceder a `req.user` para obtener usuario autenticado
- Usar `getOrganizationId(user)` para filtrado multi-tenancy

**Normalización:**
- Si se retornan usuarios, usar `normalizeUser()` helper
- Mantener formato consistente con otros endpoints

### 8.2 Patrones Obligatorios

**1. Guards:**
```typescript
@Controller('resource')
@UseGuards(JwtAuthGuard, RolesGuard)  // SIEMPRE estos dos
```

**2. Roles por endpoint:**
```typescript
@Get()
@Roles(UserRole.DIRECTION, UserRole.SUPERVISOR)  // Especificar roles
findAll(@Request() req) {
  return this.service.findAll(req.user);  // Pasar req.user
}
```

**3. Filtrado por organización:**
```typescript
async findAll(user: User) {
  const organizationId = getOrganizationId(user);
  // Filtrar por organizationId si existe
}
```

**4. DTOs con validación:**
```typescript
export class CreateResourceDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name: string;
  // ... más campos
}
```

**5. TypeORM:**
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Resource, RelatedEntity])],
  // ...
})
```

### 8.3 Consideraciones de Entidades

**Campos obligatorios:**
- `id: uuid` (PrimaryGeneratedColumn)
- `created_at: Date` (CreateDateColumn)
- `updated_at: Date` (UpdateDateColumn)

**Si tiene organización:**
- `organization_id: uuid | null`
- `@ManyToOne(() => Organization)`

**Si tiene usuario creador:**
- `user_id` o `created_by_id: uuid | null`
- `@ManyToOne(() => User)`

**Naming de columnas:**
- Usar `snake_case` en `@Column({ name: 'column_name' })`
- TypeORM convierte automáticamente a camelCase en TypeScript

### 8.4 Validaciones Importantes

**UUIDs:**
- Validar con `@IsUUID()` en DTOs

**Relaciones:**
- Verificar existencia de entidades relacionadas antes de crear
- Lanzar `NotFoundException` si no existe

**Permisos:**
- Verificar permisos específicos en servicios si es necesario
- Lanzar `ForbiddenException` si no tiene permisos

**Organización:**
- Asignar `organization_id` automáticamente desde `user`
- No permitir que usuarios cambien su organización (excepto DIRECTION)

### 8.5 Testing

**Estructura:**
- Tests unitarios: `*.spec.ts` junto al archivo
- Tests de integración: `test/integration/`

**Nota:** Los tests están desactivados temporalmente según `package.json`

---

## 9. RESUMEN EJECUTIVO

### 9.1 Estado Actual

✅ **Módulos completos y funcionales:**
- Auth (CERRADO - NO MODIFICAR)
- Users (COMPLETO)
- Works (COMPLETO)
- Expenses (COMPLETO)
- Incomes (COMPLETO)
- Contracts (COMPLETO)
- Suppliers (COMPLETO)
- Y 15+ módulos más

⚠️ **Módulos incompletos:**
- Organizations (solo entidad, sin módulo)

❌ **Endpoints que retornan 404:**
- Probablemente endpoints de módulos no conectados o mal configurados
- Verificar routing y guards

### 9.2 Checklist para Crear Módulo Nuevo

- [ ] Crear estructura de carpetas estándar
- [ ] Crear entidad TypeORM con campos obligatorios
- [ ] Crear módulo NestJS
- [ ] Crear service con métodos CRUD
- [ ] Crear controller con guards y roles
- [ ] Crear DTOs con validación
- [ ] Implementar filtrado por organización si aplica
- [ ] Agregar módulo a `app.module.ts`
- [ ] Documentar con Swagger
- [ ] Probar endpoints

### 9.3 Archivos Clave a Consultar al Crear Módulos

**Referencias:**
- `src/users/users.module.ts` - Ejemplo de módulo completo
- `src/users/users.controller.ts` - Ejemplo de controller
- `src/users/users.service.ts` - Ejemplo de service
- `src/works/works.service.ts` - Ejemplo de filtrado por organización
- `src/common/helpers/normalize-user.helper.ts` - Normalización
- `src/common/helpers/get-organization-id.helper.ts` - Helper organización

**Guards y decorators:**
- `src/common/guards/jwt-auth.guard.ts`
- `src/common/guards/roles.guard.ts`
- `src/common/decorators/roles.decorator.ts`

---

## 10. CONCLUSIÓN

Este backend NestJS está **bien estructurado** y sigue **convenciones consistentes**. Los módulos existentes pueden servir como **plantillas** para crear nuevos módulos.

**Puntos críticos a recordar:**
1. ⚠️ **NO modificar Auth** - Sistema cerrado en producción
2. ✅ Usar siempre `JwtAuthGuard` + `RolesGuard`
3. ✅ Filtrar por `organization_id` cuando aplique
4. ✅ Seguir naming conventions establecidas
5. ✅ Usar DTOs con validación
6. ✅ Normalizar respuestas de usuarios con helper
7. ✅ Documentar con Swagger

**El sistema está listo para extender con nuevos módulos siguiendo los patrones establecidos.**

---

**FIN DEL REPORTE**

