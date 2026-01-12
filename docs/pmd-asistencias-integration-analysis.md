# Análisis de Integración: PMD-asistencias → PMD Backend

## 📋 Resumen Ejecutivo

Este documento analiza el módulo no-code **PMD-asistencias** y propone cómo integrar su lógica funcional al backend PMD principal, respetando los patrones arquitectónicos existentes.

**Repositorio analizado:** [https://github.com/Augusto-pmd/PMD-asistencias](https://github.com/Augusto-pmd/PMD-asistencias)

---

## 🔍 Análisis del Módulo No-Code

### Stack Tecnológico Identificado

- **Framework:** FastAPI (Python)
- **Base de datos:** MongoDB (Motor async driver)
- **Estructura:** Monolítico, un solo archivo `server.py`

### Entidades Principales

1. **Employee** (Empleados)
   - `id`, `name`, `daily_salary`
   - `created_at`, `is_active`

2. **Contractor** (Contratistas)
   - `id`, `name`, `weekly_payment`
   - `project_name`, `budget`
   - `total_paid`, `remaining_balance`
   - `created_at`, `is_active`

3. **Attendance** (Asistencias)
   - `id`, `employee_id`, `date`, `status`
   - `late_hours`, `week_start_date`

4. **Advance** (Adelantos)
   - `id`, `employee_id`, `amount`, `date`
   - `description`, `week_start_date`

5. **PaymentHistory** (Historial de Pagos)
   - `id`, `employee_id`, `week_start_date`
   - `days_worked`, `total_salary`, `total_advances`
   - `net_payment`, `paid_at`

6. **DashboardStats** (Estadísticas)
   - Métricas agregadas para dashboard

### Flujos de Negocio Identificados

#### 1. Gestión de Contratistas con Presupuesto por Proyecto

**Lógica no-code:**
```python
class Contractor(BaseModel):
    project_name: str
    budget: float
    total_paid: float = 0.0
    remaining_balance: float = 0.0
```

**Regla de negocio:**
- Los contratistas tienen un presupuesto asociado a un `project_name`
- Se calcula `remaining_balance = budget - total_paid`

#### 2. Cálculo Automático de Pagos

**Lógica no-code:**
- Calcula días trabajados por empleado
- Aplica descuentos por horas tardías
- Calcula salario total menos adelantos

#### 3. Dashboard con Estadísticas Semanales

**Lógica no-code:**
- Agrega métricas por semana (week_start_date)
- Calcula totales de pagos, adelantos, pagos netos

---

## 🎯 Mapeo a Backend PMD

### Conceptos Equivalentes

| No-Code (PMD-asistencias) | Backend PMD | Estado |
|---------------------------|-------------|--------|
| `Contractor.project_name` | `Work.name` | ✅ Ya existe |
| `Contractor.budget` | `Work.total_budget` | ✅ Ya existe |
| `Contractor.total_paid` | `Work.total_expenses` | ✅ Ya existe |
| `Contractor.remaining_balance` | `Work.total_budget - Work.total_expenses` | ⚠️ Calculado |

### Funcionalidades a Integrar

#### 1. Cálculo Automático de `remaining_balance` en Obras

**Requisito:** Cuando se consulta una obra, incluir balance remanente calculado.

**Implementación propuesta:**

```typescript
// src/works/works.service.ts
async findOne(id: string, user: User): Promise<Work & { remaining_balance: number }> {
  const work = await this.findOne(id, user);
  
  // Calcular balance remanente (lógica adaptada de Contractor)
  const remaining_balance = Number(work.total_budget) - Number(work.total_expenses);
  
  return {
    ...work,
    remaining_balance: Math.max(0, remaining_balance), // No negativo
  };
}
```

#### 2. Endpoint de Estadísticas por Obra

**Requisito:** Endpoint similar a `/api/dashboard/stats` pero por obra.

**Implementación propuesta:**

```typescript
// src/works/dto/work-stats.dto.ts
export class WorkStatsDto {
  work_id: string;
  work_name: string;
  total_budget: number;
  total_expenses: number;
  total_incomes: number;
  remaining_balance: number;
  physical_progress: number;
  economic_progress: number;
  financial_progress: number;
  profitability: number; // incomes - expenses
}
```

```typescript
// src/works/works.controller.ts
@Get(':id/stats')
@Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
async getWorkStats(@Param('id') id: string, @Request() req) {
  return this.worksService.getWorkStats(id, req.user);
}
```

#### 3. Validación de Presupuesto al Crear Gastos

**Requisito:** Validar que no se exceda el presupuesto al crear gastos (similar a `remaining_balance` en Contractor).

**Lógica adaptada:**
- En `ExpensesService.create()`, verificar que `work.total_expenses + new_expense.amount <= work.total_budget`
- Opcionalmente, permitir exceder con aprobación de DIRECTION (similar a post-closure expenses)

---

## 📝 Implementación Propuesta

### 1. Extender `WorksService` con Cálculo de Balance

**Archivo:** `src/works/works.service.ts`

**Cambios:**

```typescript
async findOne(id: string, user: User): Promise<Work & { remaining_balance?: number }> {
  // ... código existente ...
  
  // Calcular balance remanente (lógica adaptada de Contractor)
  const remaining_balance = Number(work.total_budget) - Number(work.total_expenses);
  
  return {
    ...work,
    remaining_balance: Math.max(0, remaining_balance),
  };
}

async getWorkStats(id: string, user: User): Promise<WorkStatsDto> {
  const work = await this.findOne(id, user);
  
  const remaining_balance = Number(work.total_budget) - Number(work.total_expenses);
  const profitability = Number(work.total_incomes) - Number(work.total_expenses);
  
  return {
    work_id: work.id,
    work_name: work.name,
    total_budget: Number(work.total_budget),
    total_expenses: Number(work.total_expenses),
    total_incomes: Number(work.total_incomes),
    remaining_balance: Math.max(0, remaining_balance),
    physical_progress: Number(work.physical_progress),
    economic_progress: Number(work.economic_progress),
    financial_progress: Number(work.financial_progress),
    profitability,
  };
}
```

### 2. Crear DTO de Estadísticas

**Archivo:** `src/works/dto/work-stats.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class WorkStatsDto {
  @ApiProperty({ description: 'Work ID', type: String, format: 'uuid' })
  work_id: string;

  @ApiProperty({ description: 'Work name' })
  work_name: string;

  @ApiProperty({ description: 'Total budget allocated', type: Number })
  total_budget: number;

  @ApiProperty({ description: 'Total expenses incurred', type: Number })
  total_expenses: number;

  @ApiProperty({ description: 'Total incomes received', type: Number })
  total_incomes: number;

  @ApiProperty({ description: 'Remaining budget (budget - expenses)', type: Number })
  remaining_balance: number;

  @ApiProperty({ description: 'Physical progress percentage', type: Number, minimum: 0, maximum: 100 })
  physical_progress: number;

  @ApiProperty({ description: 'Economic progress percentage', type: Number, minimum: 0, maximum: 100 })
  economic_progress: number;

  @ApiProperty({ description: 'Financial progress percentage', type: Number, minimum: 0, maximum: 100 })
  financial_progress: number;

  @ApiProperty({ description: 'Profitability (incomes - expenses)', type: Number })
  profitability: number;
}
```

### 3. Extender `WorksController`

**Archivo:** `src/works/works.controller.ts`

**Añadir endpoint:**

```typescript
@Get(':id/stats')
@Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
@ApiOperation({
  summary: 'Get work statistics',
  description: 'Get comprehensive statistics for a work including remaining balance and profitability. Adapted from PMD-asistencias Contractor stats logic.',
})
@ApiParam({ name: 'id', description: 'Work UUID', type: String, format: 'uuid' })
@ApiResponse({ status: 200, description: 'Work statistics', type: WorkStatsDto })
@ApiResponse({ status: 403, description: 'Work does not belong to your organization' })
@ApiResponse({ status: 404, description: 'Work not found' })
async getWorkStats(@Param('id') id: string, @Request() req) {
  return this.worksService.getWorkStats(id, req.user);
}
```

### 4. Validación de Presupuesto en Gastos (Opcional)

**Archivo:** `src/expenses/expenses.service.ts`

**Añadir validación en `create()`:**

```typescript
async create(createExpenseDto: CreateExpenseDto, user: User): Promise<Expense> {
  // ... validaciones existentes ...
  
  const work = await this.workRepository.findOne({
    where: { id: createExpenseDto.work_id },
  });
  
  if (!work) {
    throw new NotFoundException(`Work with ID ${createExpenseDto.work_id} not found`);
  }
  
  // Validación adaptada de Contractor.budget: verificar que no se exceda el presupuesto
  const currentExpenses = Number(work.total_expenses) || 0;
  const newExpenseAmount = Number(createExpenseDto.amount);
  const totalBudget = Number(work.total_budget) || 0;
  
  // Si excede el presupuesto, solo DIRECTION puede aprobar
  if (currentExpenses + newExpenseAmount > totalBudget) {
    if (user.role.name !== UserRole.DIRECTION) {
      throw new ForbiddenException(
        `Expense would exceed work budget. Remaining budget: ${totalBudget - currentExpenses}. Only Direction can approve expenses that exceed budget.`
      );
    }
    // Log warning para auditoría
    this.logger.warn(
      `Expense exceeding budget approved by Direction. Work: ${work.id}, Amount: ${newExpenseAmount}, Remaining: ${totalBudget - currentExpenses}`
    );
  }
  
  // ... resto del código existente ...
}
```

---

## 🔄 Adaptaciones Realizadas

### 1. De MongoDB a PostgreSQL

- **No-code:** Usa MongoDB con Motor async
- **PMD Backend:** Usa PostgreSQL con TypeORM
- **Adaptación:** Mapeo directo de conceptos, usando repositorios TypeORM

### 2. De FastAPI a NestJS

- **No-code:** FastAPI con Pydantic models
- **PMD Backend:** NestJS con DTOs + class-validator
- **Adaptación:** DTOs con validación usando decoradores de NestJS

### 3. De AsyncIO a NestJS Injections

- **No-code:** Async functions directas
- **PMD Backend:** Services inyectados con `@Injectable()`
- **Adaptación:** Lógica encapsulada en services con inyección de dependencias

### 4. De Semanal a Por Obra

- **No-code:** Cálculos por `week_start_date`
- **PMD Backend:** Cálculos por `work_id`
- **Adaptación:** Cambio de dimensión temporal a dimensión por obra

### 5. Autenticación y Autorización

- **No-code:** Sin autenticación (módulo experimental)
- **PMD Backend:** JWT + RolesGuard + filtrado por organización
- **Adaptación:** Añadido guards y validaciones de permisos

---

## 📊 Comparación de Patrones

### No-Code Pattern

```python
@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    # Lógica directa en endpoint
    stats = DashboardStats(...)
    return stats
```

### PMD Backend Pattern

```typescript
@Get(':id/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERVISOR, UserRole.ADMINISTRATION, UserRole.DIRECTION)
async getWorkStats(@Param('id') id: string, @Request() req) {
  // Validación de usuario en controller
  // Lógica en service
  return this.worksService.getWorkStats(id, req.user);
}
```

**Diferencias clave:**
- ✅ Separación Controller/Service en PMD
- ✅ Guards de autenticación/autorización
- ✅ Filtrado por organización
- ✅ Validación de roles
- ✅ Swagger documentation

---

## ✅ Checklist de Implementación

- [ ] Extender `WorksService.findOne()` con `remaining_balance`
- [ ] Crear `WorkStatsDto`
- [ ] Implementar `WorksService.getWorkStats()`
- [ ] Añadir endpoint `GET /api/works/:id/stats`
- [ ] Agregar Swagger documentation
- [ ] (Opcional) Validación de presupuesto en `ExpensesService`
- [ ] Tests unitarios
- [ ] Tests de integración

---

## 🚀 Próximos Pasos

1. **Implementar funcionalidades básicas:**
   - Balance remanente en `findOne()`
   - Endpoint de estadísticas

2. **Validaciones avanzadas (futuro):**
   - Alerta cuando `remaining_balance < 10%` del presupuesto
   - Requerir aprobación para gastos que excedan presupuesto
   - Dashboard agregado por organización

3. **Integración con otros módulos:**
   - Notificaciones cuando se acerca al límite
   - Reportes de presupuesto vs gastado
   - Gráficos de tendencias

---

## 📝 Notas Finales

- El módulo no-code es **solo referencia funcional**, no dependencia
- Toda la lógica se **adapta** a patrones PMD existentes
- Se mantiene **desacoplamiento** (no se importa código del módulo)
- La integración es **por API** (el módulo no-code puede seguir funcionando independientemente)
- Se respeta **multi-tenancy** (filtrado por organización)
- Se mantiene **seguridad** (JWT + RolesGuard)

---

**Documento creado:** 2026-01-12  
**Última actualización:** 2026-01-12  
**Autor:** Análisis automático de integración
