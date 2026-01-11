# Protocolo de Base de Datos Viva — PMD

**Estado del Sistema:** PMD — Estado Estable v1  
**Fecha de Declaración:** 2024-12-20  
**Responsabilidad:** CTO / Arquitecto Senior

---

## Definición: Base de Datos Viva

**Base de datos viva** es una base de datos PostgreSQL en producción que:

1. ✅ **Ya existe** y está siendo utilizada por usuarios reales
2. ✅ **Tiene tablas, relaciones, y datos** preexistentes
3. ✅ **NO debe ser modificada automáticamente** por el código de la aplicación
4. ✅ **NO debe ser recreada** ni restaurada desde cero
5. ✅ **Solo acepta cambios estructurales manuales** ejecutados explícitamente por un humano

**En PMD, la base de datos en Render es una base de datos viva.**

---

## Prohibiciones Terminantes

### ❌ NO PERMITIDO: Ejecución Automática de Migraciones

**Cualquier mecanismo que ejecute migraciones TypeORM automáticamente está prohibido:**

1. ❌ `migrationsRun: true` en configuración TypeORM
2. ❌ Scripts de entrypoint que ejecuten `npm run migration:run`
3. ❌ Variables de entorno que activen migraciones al iniciar
4. ❌ Cualquier código que intente crear tablas que ya existen

**Razón:** La base de datos viva ya tiene todas las tablas. Ejecutar migraciones automáticamente causa errores `relation already exists`.

### ❌ NO PERMITIDO: Sincronización Automática del Esquema

**TypeORM `synchronize` está terminantemente prohibido:**

1. ❌ `synchronize: true` en cualquier entorno de producción
2. ❌ Cualquier código que modifique el esquema basándose en entities
3. ❌ Scripts que comparan entities con DB y aplican cambios

**Razón:** La base de datos viva tiene un esquema estable. La sincronización automática puede causar pérdida de datos o inconsistencias.

### ❌ NO PERMITIDO: Recreación de la Base de Datos

**Nunca se debe:**

1. ❌ Eliminar y recrear la base de datos
2. ❌ Ejecutar `DROP SCHEMA public CASCADE`
3. ❌ Restaurar desde un backup sin autorización explícita
4. ❌ Hacer cambios no idempotentes

**Razón:** La base de datos viva contiene datos de producción. La recreación causa pérdida de datos.

---

## Única Forma Válida: SQL Manual Idempotente

**Los cambios estructurales a la base de datos viva SOLO se realizan mediante:**

### 1. SQL Manual Idempotente

SQL que puede ejecutarse múltiples veces sin causar errores si el cambio ya fue aplicado.

**Ejemplo correcto:**
```sql
-- Agregar columna si no existe (idempotente)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'works' AND column_name = 'post_closure_enabled_by_id'
    ) THEN
        ALTER TABLE works 
        ADD COLUMN post_closure_enabled_by_id uuid,
        ADD CONSTRAINT fk_works_post_closure_enabled_by 
        FOREIGN KEY (post_closure_enabled_by_id) 
        REFERENCES users(id) 
        ON DELETE SET NULL;
    END IF;
END $$;
```

**Ejemplo incorrecto (NO idempotente):**
```sql
-- Esto falla si la columna ya existe
ALTER TABLE works ADD COLUMN post_closure_enabled_by_id uuid;
```

### 2. Proceso de Ejecución

1. **Desarrollo:** El ingeniero escribe SQL idempotente
2. **Revisión:** El CTO / Arquitecto revisa el SQL
3. **Aprobación:** Se aprueba el cambio estructural
4. **Ejecución:** Se ejecuta manualmente en producción (DBeaver, psql, etc.)
5. **Verificación:** Se verifica que el cambio se aplicó correctamente
6. **Documentación:** Se documenta el cambio en el repositorio

### 3. Documentación del Cambio

Cada cambio estructural debe documentarse en el repositorio:

- **Archivo:** `docs/db-changes/YYYY-MM-DD-description.md`
- **Contenido:**
  - Fecha y autor
  - Razón del cambio
  - SQL ejecutado
  - Verificación post-cambio

---

## Errores Reales Ocurridos

### Error 1: `relation "roles" already exists` (42P07)

**Causa:**  
El backend intentó ejecutar la migración `CreateBaseTables1700000000002` que crea la tabla `roles`. La tabla ya existía en la base de datos viva.

**Síntoma:**
```
QueryFailedError: relation "roles" already exists
Error: 42P07
```

**Solución aplicada:**
- Deshabilitar `migrationsRun` en producción (`migrationsRun: false`)
- Vaciar array de migraciones (`migrations: []`)
- Configurar TypeORM para solo conectar, no modificar

**Lección aprendida:**  
Las migraciones TypeORM no deben ejecutarse automáticamente en bases de datos vivas.

### Error 2: Reinicios en bucle en Render

**Causa:**  
El backend intentaba ejecutar migraciones al iniciar. Fallaba con `relation already exists`, Render reiniciaba el servicio, y el ciclo se repetía.

**Síntoma:**
- Servicio en Render reiniciando continuamente
- Logs mostrando `relation already exists` repetidamente
- Servicio no disponible

**Solución aplicada:**
- Eliminar ejecución automática de migraciones
- Configurar TypeORM para operación read-only sobre esquema

**Lección aprendida:**  
El backend debe iniciar sin intentar modificar el esquema en producción.

---

## Principio: La DB Viva No Se Repara por Ensayo

**El sistema PMD NO opera bajo el modelo de "prueba y error".**

### ❌ Modelo Incorrecto (NO usar):
1. Ejecutar migraciones automáticamente
2. Si falla, intentar otra cosa
3. Si sigue fallando, revertir cambios
4. Repetir hasta que funcione

### ✅ Modelo Correcto (Seguir):
1. Analizar el estado actual de la base de datos
2. Diseñar el cambio estructural explícitamente
3. Escribir SQL idempotente
4. Revisar y aprobar el cambio
5. Ejecutar manualmente en producción
6. Verificar que el cambio se aplicó correctamente
7. Documentar el cambio

**Cada cambio estructural debe ser planificado, revisado, y ejecutado conscientemente.**

---

## Verificación del Estado Actual

Antes de proponer cualquier cambio estructural:

1. **Verificar esquema actual:**
   ```sql
   -- Listar todas las tablas
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

2. **Verificar columnas de una tabla:**
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'nombre_tabla'
   ORDER BY ordinal_position;
   ```

3. **Verificar constraints:**
   ```sql
   SELECT constraint_name, constraint_type
   FROM information_schema.table_constraints
   WHERE table_name = 'nombre_tabla';
   ```

---

## Checklist Pre-Cambio Estructural

Antes de ejecutar cualquier cambio estructural:

- [ ] El cambio está documentado y aprobado
- [ ] El SQL es idempotente (puede ejecutarse múltiples veces)
- [ ] Se verificó el estado actual de la base de datos
- [ ] Se tiene un plan de rollback (si aplica)
- [ ] Se verificará el cambio post-ejecución
- [ ] Se documentará el cambio en el repositorio

---

## Referencias

- Reglas de Producción: `/docs/production-rules.md`
- Deploy Checklist: `/docs/deploy-checklist.md`
- Configuración TypeORM: `src/config/database.config.ts`

---

**Este protocolo es parte del contrato de gobernanza del sistema PMD.**  
**Cualquier cambio estructural debe seguir este protocolo estrictamente.**
