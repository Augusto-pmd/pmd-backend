# Deploy Checklist — PMD

**Estado del Sistema:** PMD — Estado Estable v1  
**Fecha de Declaración:** 2024-12-20  
**Responsabilidad:** Ingeniero que ejecuta el deploy

---

## Propósito

Este checklist debe ejecutarse **ANTES de cada deploy a producción** para garantizar que:

1. ✅ La configuración de TypeORM está correcta (migraciones deshabilitadas)
2. ✅ Las variables de entorno están configuradas
3. ✅ El branch y PR son correctos
4. ✅ No hay migraciones activas que puedan ejecutarse
5. ✅ El deploy puede proceder sin riesgo

**⚠️ NO hacer deploy sin completar este checklist.**

---

## Pre-Deploy Checklist

### 1. Verificación de Configuración TypeORM

**Archivo:** `src/config/database.config.ts`  
**Líneas críticas:** 100-103

**Verificar que en el bloque `if (databaseUrl)` (producción):**

- [ ] `migrationsRun: false` está presente
- [ ] `migrations: []` está presente (array vacío)
- [ ] `synchronize: false` está presente
- [ ] No hay comentarios temporales sobre habilitar migraciones

**Comando de verificación:**
```bash
grep -A 5 "PRODUCCIÓN VIVA" src/config/database.config.ts
```

**Output esperado:**
```
// PRODUCCIÓN VIVA: Migraciones deshabilitadas completamente
// La base de datos ya existe y NO debe modificarse automáticamente
migrationsRun: false,
migrations: [],
```

**❌ Si `migrationsRun: true` o `migrations: ['dist/migrations/*.js']` → DETENER el deploy**

---

### 2. Verificación de Variables de Entorno

**Verificar en Render / Vercel que las siguientes variables están configuradas:**

#### Backend (Render)
- [ ] `DATABASE_URL` está configurada (URL completa de PostgreSQL)
- [ ] `NODE_ENV=production` está configurada
- [ ] `JWT_SECRET` está configurada
- [ ] Variables específicas de la aplicación están configuradas

#### Frontend (Vercel)
- [ ] `NEXT_PUBLIC_API_URL` apunta al backend en Render
- [ ] Variables de entorno necesarias están configuradas

**❌ Si falta `DATABASE_URL` o `NODE_ENV` → DETENER el deploy**

---

### 3. Verificación de Branch y PR

**Verificar que:**

- [ ] El cambio viene de un **Pull Request** (no commit directo a `main`)
- [ ] El PR tiene **descripción clara** de los cambios
- [ ] El PR **NO modifica** `database.config.ts` sin justificación explícita
- [ ] El CI / validate está **en verde** antes de hacer merge

**Comandos de verificación:**
```bash
# Ver branch actual
git branch --show-current

# Ver PRs abiertos
gh pr status

# Ver último commit
git log --oneline -1
```

**❌ Si hay commit directo a `main` → REVERTIR y crear PR**

**❌ Si el CI no está en verde → ESPERAR a que pase**

---

### 4. Verificación de Migraciones

**Verificar que NO hay migraciones activas:**

- [ ] No hay cambios en `src/migrations/*.ts` que vayan a producción
- [ ] No hay referencias a `migrationsRun: true` en el código
- [ ] No hay scripts que ejecuten migraciones en el entrypoint

**Comando de verificación:**
```bash
# Buscar referencias a migrationsRun: true
grep -r "migrationsRun: true" src/

# Debe retornar VACÍO (no hay resultados)
```

**❌ Si hay `migrationsRun: true` en el código → DETENER el deploy**

---

### 5. Build Local

**Ejecutar build local para verificar que compila:**

```bash
yarn install
yarn build
```

**Verificar:**

- [ ] El build completa sin errores
- [ ] Las migraciones se compilan (solo para verificación, no se ejecutan)
- [ ] `dist/main.js` se genera correctamente

**❌ Si el build falla → CORREGIR errores antes de deploy**

---

### 6. Verificación de Cambios Críticos

**Si el PR modifica configuración de base de datos:**

- [ ] El cambio está **justificado** en la descripción del PR
- [ ] El cambio está **documentado** en `/docs/` si es necesario
- [ ] El CTO / Arquitecto **aprobó** el cambio explícitamente

**Cambios críticos que requieren aprobación:**
- Modificaciones a `database.config.ts`
- Cambios a variables de entorno relacionadas con DB
- Cualquier código que toque migraciones o sincronización

**❌ Si hay cambios críticos sin aprobación → ESPERAR aprobación**

---

## Proceso de Deploy

### Paso 1: Merge del PR

```bash
# Verificar que el PR está listo
gh pr view

# Hacer merge (squash merge recomendado)
gh pr merge --squash --delete-branch
```

### Paso 2: Verificar que Render detecta el cambio

- [ ] Render inicia el build automáticamente
- [ ] Los logs de build muestran que compila correctamente
- [ ] No hay errores en el build

### Paso 3: Monitorear el Deploy

**Verificar en logs de Render:**

- [ ] El servicio inicia correctamente
- [ ] **NO** aparecen mensajes de migraciones ejecutándose
- [ ] **NO** aparecen errores `relation already exists`
- [ ] El servicio queda en estado "Live" (no reinicia en bucle)

**Logs esperados (correctos):**
```
Nest application successfully started
Application is running on: http://[::]:10000
```

**Logs NO esperados (incorrectos):**
```
Running migrations...
QueryFailedError: relation "roles" already exists
```

**❌ Si aparecen errores de migraciones → DETENER el servicio y revertir**

---

## Post-Deploy Verification

### 1. Verificación de Salud del Servicio

**Verificar que el servicio está activo:**

- [ ] El servicio está "Live" en Render
- [ ] No hay reinicios continuos
- [ ] El endpoint `/health` responde correctamente

**Comando de verificación:**
```bash
curl https://pmd-backend.onrender.com/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2024-12-20T..."
}
```

### 2. Verificación de Base de Datos

**Verificar que la base de datos está accesible:**

- [ ] El backend puede conectarse a PostgreSQL
- [ ] Las queries básicas funcionan
- [ ] No hay errores de conexión en logs

### 3. Verificación Funcional (Opcional)

**Si hay cambios de features:**

- [ ] Los endpoints afectados funcionan correctamente
- [ ] No hay errores 500 inesperados
- [ ] El frontend puede conectarse al backend

---

## Rollback Procedure

**Si el deploy causa problemas:**

### Paso 1: Revertir el commit

```bash
# Ver último commit
git log --oneline -3

# Revertir el commit problemático
git revert HEAD

# Push del revert
git push origin main
```

### Paso 2: Detener el servicio en Render (si es necesario)

- Pausar el servicio temporalmente
- Verificar logs para identificar el problema
- Corregir el problema antes de reactivar

---

## Checklist Resumen

**Antes de cada deploy, verificar:**

- [x] TypeORM: `migrationsRun: false`, `migrations: []`, `synchronize: false`
- [x] Variables de entorno: `DATABASE_URL`, `NODE_ENV=production`
- [x] Branch y PR: PR abierto, CI en verde
- [x] Migraciones: No hay `migrationsRun: true` en código
- [x] Build local: Compila sin errores
- [x] Cambios críticos: Aprobados y documentados (si aplica)

**Durante el deploy:**

- [x] Render inicia build automáticamente
- [x] Logs muestran inicio correcto
- [x] NO aparecen mensajes de migraciones ejecutándose

**Post-deploy:**

- [x] Servicio está "Live"
- [x] Endpoint `/health` responde
- [x] Base de datos accesible

---

## Referencias

- Reglas de Producción: `/docs/production-rules.md`
- Protocolo DB Viva: `/docs/db-viva-protocol.md`
- Configuración TypeORM: `src/config/database.config.ts`

---

**Este checklist es obligatorio antes de cada deploy a producción.**  
**NO hacer deploy sin completar todas las verificaciones.**
