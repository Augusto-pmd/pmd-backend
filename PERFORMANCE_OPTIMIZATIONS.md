# Optimizaciones de Performance - PMD Management System

**Fecha:** 2025-01-01  
**Versión:** 1.0

---

## 📊 Resumen

Este documento describe las optimizaciones de performance implementadas para mejorar el rendimiento de las consultas de reportes contables y del historial de caja.

---

## ✅ Optimizaciones Implementadas

### 1. Índices de Base de Datos

#### Migración: `1700000000027-OptimizePerformanceIndexes`

Se agregaron índices compuestos para optimizar las consultas más frecuentes:

#### Índices para Reportes Contables (`accounting_records`)

1. **`IDX_accounting_records_type_month_year`**
   - Columnas: `accounting_type`, `month`, `year`
   - Optimiza: Consultas por tipo contable y período (mes/año)
   - Uso: Reportes generales filtrados por período

2. **`IDX_accounting_records_month_year_work`**
   - Columnas: `month`, `year`, `work_id`
   - Condición: `WHERE work_id IS NOT NULL`
   - Optimiza: Reportes filtrados por obra específica
   - Uso: `getPurchasesBook()`, `getPerceptionsReport()`, `getWithholdingsReport()` con filtro por obra

3. **`IDX_accounting_records_month_year_supplier`**
   - Columnas: `month`, `year`, `supplier_id`
   - Condición: `WHERE supplier_id IS NOT NULL`
   - Optimiza: Reportes filtrados por proveedor específico
   - Uso: Reportes contables con filtro por proveedor

4. **`IDX_works_organization_id`**
   - Columnas: `organization_id`
   - Condición: `WHERE organization_id IS NOT NULL`
   - Optimiza: Filtrado por organización en joins con la tabla `works`
   - Uso: Filtrado por organización en reportes contables

#### Índices para Historial de Caja (`cash_movements`)

1. **`IDX_cash_movements_cashbox_date`**
   - Columnas: `cashbox_id`, `date DESC`
   - Optimiza: Consultas de historial ordenadas por fecha descendente
   - Uso: `getHistory()` - consulta principal paginada

2. **`IDX_cash_movements_cashbox_type_date`**
   - Columnas: `cashbox_id`, `type`, `date DESC`
   - Optimiza: Consultas filtradas por tipo de movimiento
   - Uso: `getHistory()` con filtro por tipo

3. **`IDX_cash_movements_cashbox_currency_date`**
   - Columnas: `cashbox_id`, `currency`, `date DESC`
   - Optimiza: Consultas filtradas por moneda
   - Uso: `getHistory()` con filtro por moneda

4. **`IDX_cash_movements_date_range`**
   - Columnas: `cashbox_id`, `date`
   - Optimiza: Consultas con rangos de fechas
   - Uso: `getHistory()` con filtros de fecha inicio/fin

---

### 2. Optimización de Consultas SQL

#### Reportes Contables

**Antes:**
- Se cargaban todos los registros del mes/año en memoria
- Se filtraban los registros con percepciones/retenciones en JavaScript
- Se calculaban totales usando `reduce()` sobre arrays

**Después:**
- Los filtros se aplican directamente en SQL usando `WHERE` clauses
- Solo se cargan los registros que cumplen los criterios
- Reduce significativamente el uso de memoria y tiempo de procesamiento

**Cambios en `accounting.service.ts`:**

```typescript
// Antes (getPerceptionsReport)
const records = await queryBuilder.getMany();
const filteredRecords = records.filter(
  (r) => r.vat_perception > 0 || r.iibb_perception > 0,
);

// Después
queryBuilder.andWhere(
  '(record.vat_perception > 0 OR record.iibb_perception > 0)',
);
const filteredRecords = await queryBuilder.getMany();
```

**Mismo cambio aplicado a `getWithholdingsReport()`**

#### Historial de Caja

**Antes:**
- Se ejecutaban dos consultas: una paginada y otra completa para el resumen
- La consulta de resumen cargaba TODOS los movimientos de la caja en memoria
- Se calculaban totales iterando sobre el array completo en JavaScript

**Después:**
- Se usa una sola consulta con agregaciones SQL para el resumen
- No se cargan todos los registros en memoria
- Los cálculos se realizan en la base de datos usando `COUNT()` y `SUM()` con `CASE` statements

**Cambios en `cashboxes.service.ts`:**

```typescript
// Antes (getHistory)
const allMovements = await this.cashMovementRepository.find({
  where: { cashbox_id: id },
});
// ... iterar sobre allMovements en JavaScript

// Después
const summaryQueryBuilder = this.cashMovementRepository
  .createQueryBuilder('movement')
  .select(`COUNT(CASE WHEN movement.type = 'REFILL' THEN 1 END)`, 'totalRefills')
  .addSelect(`COUNT(CASE WHEN movement.type = 'EXPENSE' THEN 1 END)`, 'totalExpenses')
  // ... más agregaciones SQL
  .where('movement.cashbox_id = :cashboxId', { cashboxId: id });
// ... aplicar mismos filtros
const summaryResult = await summaryQueryBuilder.getRawOne();
```

---

## 📈 Impacto Esperado

### Reportes Contables

- **Reducción de memoria:** 50-90% dependiendo del tamaño del dataset
- **Mejora de velocidad:** 2-5x más rápido en consultas con muchos registros
- **Escalabilidad:** Mejor rendimiento a medida que crece el volumen de datos

### Historial de Caja

- **Reducción de memoria:** 80-95% para cajas con muchos movimientos
- **Mejora de velocidad:** 3-10x más rápido en cajas con >100 movimientos
- **Escalabilidad:** El tiempo de respuesta no aumenta significativamente con más movimientos

---

## 🔍 Verificación

### Verificar Índices en PostgreSQL

```sql
-- Ver todos los índices de accounting_records
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'accounting_records' 
ORDER BY indexname;

-- Ver todos los índices de cash_movements
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'cash_movements' 
ORDER BY indexname;

-- Verificar uso de índices (requiere pg_stat_statements)
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN ('accounting_records', 'cash_movements')
ORDER BY idx_scan DESC;
```

### Analizar Planes de Ejecución

```sql
-- Para reportes contables
EXPLAIN ANALYZE
SELECT * FROM accounting_records
WHERE month = 1 AND year = 2025
  AND accounting_type = 'fiscal'
ORDER BY date ASC;

-- Para historial de caja
EXPLAIN ANALYZE
SELECT * FROM cash_movements
WHERE cashbox_id = '...'
ORDER BY date DESC, created_at DESC
LIMIT 20;
```

---

## 📝 Notas de Mantenimiento

### Cuándo Reconsiderar los Índices

1. **Si el tamaño de la base de datos crece significativamente:**
   - Monitorear el tamaño de los índices
   - Considerar particionamiento si es necesario

2. **Si aparecen nuevos patrones de consulta:**
   - Analizar queries lentas con `EXPLAIN ANALYZE`
   - Agregar índices adicionales si es necesario

3. **Si hay problemas de rendimiento:**
   - Usar `pg_stat_statements` para identificar queries lentas
   - Revisar el uso de índices con `pg_stat_user_indexes`

### Revisar Índices No Utilizados

```sql
-- Índices con pocas o ninguna lectura
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan < 10
AND tablename IN ('accounting_records', 'cash_movements')
ORDER BY idx_scan;
```

Índices no utilizados pueden ralentizar las operaciones de escritura, considere eliminarlos si no son necesarios.

---

## 🚀 Próximas Optimizaciones Sugeridas

1. **Cacheo de Reportes:**
   - Implementar cacheo de reportes contables para períodos cerrados
   - Usar Redis o similar para cachear resultados

2. **Paginación de Reportes:**
   - Agregar paginación a reportes contables para datasets grandes
   - Reducir el tamaño de respuestas HTTP

3. **Vistas Materializadas:**
   - Considerar vistas materializadas para reportes complejos
   - Actualizar periódicamente con cron jobs

4. **Índices Adicionales:**
   - Monitorear queries lentas en producción
   - Agregar índices según necesidad real

---

**Última actualización:** 2025-01-01

