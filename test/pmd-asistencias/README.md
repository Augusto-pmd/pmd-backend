# Tests PMD Asistencias

Tests unitarios y de integración para el módulo PMD Asistencias integrado al backend PMD.

## 📋 Estructura

```
test/pmd-asistencias/
├── README.md                        # Este archivo
├── unit/                            # Tests unitarios
│   └── works-stats.service.spec.ts # Tests para WorksService.getWorkStats()
└── integration/                     # Tests de integración
    └── work-stats.e2e-spec.ts      # Tests para GET /api/works/:id/stats
```

## 🧪 Tests Unitarios

### `works-stats.service.spec.ts`

Tests para el método `WorksService.getWorkStats()`:

**Cobertura:**
- ✅ Cálculo correcto de estadísticas
  - `total_budget`
  - `total_expenses`
  - `total_incomes`
  - `remaining_balance`
  - `profitability`
- ✅ Casos edge
  - Obra sin gastos
  - Obra sin presupuesto
  - Gastos exceden presupuesto
  - Valores null/undefined
  - Rentabilidad negativa
- ✅ Validación de permisos
  - Usuario sin acceso → `ForbiddenException`
  - Supervisor sin obra asignada → `ForbiddenException`
  - Supervisor con obra asignada → éxito

**Ejecutar:**
```bash
npm test -- works-stats.service.spec.ts
```

## 🔗 Tests de Integración

### `work-stats.e2e-spec.ts`

Tests end-to-end para el endpoint `GET /api/works/:id/stats`:

**Cobertura:**
- ✅ Autenticación
  - Usuario autenticado válido → `200`
  - Usuario sin token → `401`
  - Token inválido → `401`
- ✅ Autorización
  - Roles permitidos (ADMIN, SUPERVISOR, DIRECTION) → `200`
  - Rol no permitido (OPERATOR) → `403`
- ✅ Filtrado por organización
  - Obra de otra organización → `403`
- ✅ Validación de supervisor
  - Supervisor sin obra asignada → `403`
  - Supervisor con obra asignada → `200`
- ✅ Cálculos correctos
  - `remaining_balance` = `budget - expenses` (no negativo)
  - `profitability` = `incomes - expenses` (puede ser negativo)
- ✅ Casos edge
  - Obra sin gastos
  - Obra sin presupuesto
  - Gastos exceden presupuesto

**Ejecutar:**
```bash
npm run test:e2e -- work-stats.e2e-spec.ts
```

## 🚀 Ejecutar Tests

### Todos los tests de PMD Asistencias

```bash
# Tests unitarios
npm test -- pmd-asistencias

# Tests de integración
npm run test:e2e -- pmd-asistencias
```

### Tests específicos

```bash
# Tests unitarios
npm test -- works-stats.service.spec.ts

# Tests de integración
npm run test:e2e -- work-stats.e2e-spec.ts
```

### Con cobertura

```bash
# Tests unitarios con cobertura
npm test -- --coverage --collectCoverageFrom='src/works/**/*.ts' works-stats.service.spec.ts
```

## 📊 Cobertura Esperada

### Tests Unitarios

- **Método:** `WorksService.getWorkStats()`
- **Cobertura:** 100% de ramas y casos edge
- **Casos cubiertos:** 12+ casos

### Tests de Integración

- **Endpoint:** `GET /api/works/:id/stats`
- **Cobertura:** Todos los flujos principales y casos edge
- **Casos cubiertos:** 15+ casos

## ✅ Checklist de Validación

- [x] Tests unitarios implementados
- [x] Tests de integración implementados
- [x] Sin errores de linter
- [ ] Tests pasan localmente
- [ ] Tests pasan en CI/CD

## 🔄 Adaptaciones de PMD-asistencias

Los tests validan la lógica adaptada del módulo no-code PMD-asistencias:

| No-Code (PMD-asistencias) | Backend PMD | Validado en Tests |
|---------------------------|-------------|-------------------|
| `Contractor.budget` | `Work.total_budget` | ✅ |
| `Contractor.total_paid` | `Work.total_expenses` | ✅ |
| `Contractor.remaining_balance` | Calculado: `budget - expenses` | ✅ |
| Cálculo de rentabilidad | `profitability = incomes - expenses` | ✅ |

## 📝 Notas

- Los tests son **determinísticos** y **independientes**
- No hay **dependencias entre tests**
- No hay **efectos colaterales** (cada test limpia su estado)
- Los tests usan **mocks** para repositorios (unitarios)
- Los tests usan **base de datos de test** (integración)

## 🎯 Próximos Pasos

1. ✅ Tests unitarios para `getWorkStats()`
2. ✅ Tests de integración para endpoint
3. ⏳ Ejecutar tests y verificar que pasan
4. ⏳ Añadir tests de regresión para nuevas features

---

**Documentación relacionada:**
- [Análisis de integración](../../docs/pmd-asistencias-integration-analysis.md)
- [Resumen de implementación](../../docs/pmd-asistencias-implementation-summary.md)
