# PMD — Reglas Absolutas de Producción

**Estado del Sistema:** PMD — Estado Estable v1  
**Fecha de Declaración:** 2024-12-20  
**Responsabilidad:** CTO / Arquitecto Senior

---

## Principio Rector del Sistema

**PMD es un sistema en producción viva con base de datos preexistente.**

El sistema debe operar bajo el principio de **cero modificaciones automáticas del esquema de base de datos**. Cualquier cambio estructural debe ser explícito, revisado, y ejecutado manualmente.

Render y Vercel son **ejecutores pasivos**. No toman decisiones sobre el esquema de la base de datos.

---

## Definición de Roles

### 🧠 Cerebro (CTO / Arquitecto Senior)
- Define las reglas de gobernanza
- Aprueba cambios estructurales a la base de datos
- Autoriza modificaciones al esquema
- Documenta decisiones arquitectónicas

### 👨‍💻 Ingenieros
- Desarrollan features sobre el esquema existente
- Proponen cambios estructurales (SQL manual idempotente)
- Siguen el protocolo de DB viva
- Ejecutan el deploy checklist antes de cada deploy

### ⚙️ Infraestructura (Render / Vercel)
- Ejecuta el código desplegado
- No toma decisiones sobre el esquema
- No ejecuta migraciones automáticamente
- No sincroniza el esquema

---

## Reglas Absolutas de Producción

### ✅ OBLIGATORIO: Configuración TypeORM en Producción

Cuando `DATABASE_URL` está presente (producción en Render):

```typescript
{
  synchronize: false,        // SIEMPRE false
  migrationsRun: false,      // SIEMPRE false
  migrations: [],            // SIEMPRE array vacío
  autoLoadEntities: true,    // OK: solo carga entidades, no modifica esquema
  logging: false,            // Producción: no logging de queries
  ssl: { rejectUnauthorized: false }  // Requerido para Render
}
```

**Archivo:** `src/config/database.config.ts`  
**Línea crítica:** 81-111 (bloque `if (databaseUrl)`)

### ❌ PROHIBIDO: Ejecución Automática de Migraciones

**Terminantemente prohibido en producción:**

1. `migrationsRun: true` → **NO PERMITIDO**
2. `migrations: ['dist/migrations/*.js']` → **NO PERMITIDO** (debe ser `[]`)
3. `synchronize: true` → **NO PERMITIDO**
4. Cualquier mecanismo que ejecute migraciones al iniciar la aplicación

### ❌ PROHIBIDO: Modificación Automática del Esquema

**Terminantemente prohibido:**

1. TypeORM `synchronize` en cualquier entorno de producción
2. Scripts que ejecuten migraciones en el entrypoint
3. Variables de entorno que activen `RUN_MIGRATIONS=true` en producción
4. Cualquier código que modifique el esquema sin intervención humana explícita

---

## Prohibiciones Explícitas

### Base de Datos

- ❌ **NO** ejecutar migraciones TypeORM en producción
- ❌ **NO** usar `synchronize: true` en ningún entorno de producción
- ❌ **NO** modificar tablas automáticamente al iniciar la aplicación
- ❌ **NO** crear tablas que ya existen
- ❌ **NO** ejecutar scripts de seed en producción sin autorización explícita

### Código y Configuración

- ❌ **NO** cambiar `migrationsRun` a `true` sin revisión arquitectónica
- ❌ **NO** agregar rutas de migraciones a la configuración de producción
- ❌ **NO** modificar `database.config.ts` sin actualizar esta documentación
- ❌ **NO** hacer commits que cambien la configuración de TypeORM sin PR explícito

### Deployment

- ❌ **NO** hacer deploy sin ejecutar el deploy checklist
- ❌ **NO** hacer deploy directo a `main` sin PR
- ❌ **NO** hacer deploy sin verificar que `migrationsRun: false` y `migrations: []`

---

## Declaración: PMD — Estado Estable v1

**A partir de 2024-12-20, el sistema PMD opera bajo las siguientes condiciones:**

1. ✅ La base de datos es **viva y preexistente**
2. ✅ El esquema **NO se modifica automáticamente**
3. ✅ Las migraciones TypeORM **NO se ejecutan automáticamente**
4. ✅ Los cambios estructurales se realizan **SOLO mediante SQL manual idempotente**
5. ✅ Render y Vercel son **ejecutores pasivos** del código

**Cualquier violación de estas reglas puede causar:**
- Errores `relation already exists` (42P07)
- Reinicios en bucle del servicio
- Pérdida de datos o inconsistencias
- Downtime no planificado

---

## Verificación de Cumplimiento

Antes de cada commit que toque configuración de TypeORM:

1. Verificar `src/config/database.config.ts` líneas 100-103
2. Confirmar `migrationsRun: false`
3. Confirmar `migrations: []`
4. Confirmar `synchronize: false`
5. Ejecutar `yarn build` y verificar que compila sin errores

**Comando de verificación rápida:**
```bash
grep -A 5 "PRODUCCIÓN VIVA" src/config/database.config.ts
```

Debe mostrar:
```
// PRODUCCIÓN VIVA: Migraciones deshabilitadas completamente
// La base de datos ya existe y NO debe modificarse automáticamente
migrationsRun: false,
migrations: [],
```

---

## Referencias

- Protocolo DB Viva: `/docs/db-viva-protocol.md`
- Deploy Checklist: `/docs/deploy-checklist.md`
- Configuración actual: `src/config/database.config.ts`

---

**Esta documentación es parte del contrato de gobernanza del sistema PMD.**  
**Cualquier cambio a estas reglas debe ser aprobado por el CTO / Arquitecto Senior.**
