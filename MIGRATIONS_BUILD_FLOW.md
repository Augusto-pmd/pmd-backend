# 🔄 Flujo de Compilación y Ejecución de Migraciones

## Diagrama de Relación entre Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO COMPLETO                              │
└─────────────────────────────────────────────────────────────────┘

1. BUILD TIME (Dockerfile - Stage Builder)
   │
   ├─> package.json: "build": "nest build && npm run build:migrations"
   │   │
   │   ├─> nest build
   │   │   └─> Compila aplicación NestJS → dist/main.js
   │   │
   │   └─> npm run build:migrations
   │       └─> node scripts/build-migrations.js
   │           └─> Compila src/migrations/*.ts → dist/migrations/*.js
   │
   └─> Resultado: dist/ contiene aplicación + migraciones compiladas

2. RUNTIME (Dockerfile - Stage Production)
   │
   ├─> COPY --from=builder /app/dist ./dist
   │   └─> Copia dist/ (incluye dist/migrations/*.js)
   │
   ├─> COPY --from=builder /app/src ./src
   │   └─> Copia src/ (fallback para migraciones fuente)
   │
   └─> CMD ["./scripts/start.sh"]
       │
       └─> start.sh ejecuta:
           │
           ├─> wait_for_postgres()
           │
           └─> run_migrations()
               │
               └─> npm run migration:run
                   │
                   └─> typeorm-ts-node-commonjs migration:run -d src/data-source.ts
                       │
                       └─> data-source.ts decide:
                           │
                           ├─> Si NODE_ENV=production:
                           │   ├─> ¿Existe dist/migrations/*.js?
                           │   │   ├─> SÍ → Usa dist/migrations/*.js
                           │   │   └─> NO → Usa src/migrations/*.ts (fallback)
                           │   │
                           └─> Si NODE_ENV=development:
                               └─> Usa src/migrations/*.ts
```

---

## 📋 Relación Detallada entre Componentes

### 1. `package.json` → `build:migrations`

**Ubicación:** `package.json` línea 9-10

```json
{
  "scripts": {
    "build": "nest build && npm run build:migrations",
    "build:migrations": "node scripts/build-migrations.js"
  }
}
```

**Función:**
- `build:migrations` es un script que ejecuta `scripts/build-migrations.js`
- Se llama automáticamente cuando ejecutas `npm run build`
- Compila todas las migraciones TypeScript a JavaScript

**Qué hace `build-migrations.js`:**
1. Busca archivos `.ts` en `src/migrations/`
2. Compila cada uno a JavaScript usando `tsc`
3. Guarda los archivos `.js` en `dist/migrations/`

---

### 2. `Dockerfile` → `build:migrations`

**Ubicación:** `Dockerfile` línea 16

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
...
RUN npm run build  # ← Aquí se ejecuta build:migrations
```

**Flujo en Dockerfile:**

#### Stage 1: Builder
```dockerfile
RUN npm run build
```
Esto ejecuta:
1. `nest build` → Compila la aplicación
2. `npm run build:migrations` → Compila las migraciones

**Resultado:** 
- `dist/main.js` (aplicación)
- `dist/migrations/*.js` (migraciones compiladas)

#### Stage 2: Production
```dockerfile
COPY --from=builder /app/dist ./dist      # Copia migraciones compiladas
COPY --from=builder /app/src ./src       # Copia migraciones fuente (fallback)
COPY --from=builder /app/scripts ./scripts
```

**Por qué copiar ambos:**
- `dist/migrations/*.js` → Migraciones compiladas (preferidas en producción)
- `src/migrations/*.ts` → Migraciones fuente (fallback si no hay compiladas)

---

### 3. `start.sh` → Ejecución de Migraciones

**Ubicación:** `scripts/start.sh` línea 99

```bash
npm run migration:run
```

**Qué hace:**
1. Ejecuta `typeorm-ts-node-commonjs migration:run -d src/data-source.ts`
2. TypeORM lee `src/data-source.ts`
3. `data-source.ts` decide qué migraciones usar

---

### 4. `data-source.ts` → Decisión Inteligente

**Ubicación:** `src/data-source.ts` líneas 72-85

```typescript
migrations: (() => {
  if (process.env.NODE_ENV === 'production') {
    const distMigrationsPath = path.join(process.cwd(), 'dist', 'migrations');
    if (fs.existsSync(distMigrationsPath)) {
      const files = fs.readdirSync(distMigrationsPath);
      if (files.some(f => f.endsWith('.js'))) {
        return ['dist/migrations/*.js'];  // ✅ Usa compiladas
      }
    }
    return ['src/migrations/*.ts'];  // ⚠️ Fallback a fuente
  }
  return ['src/migrations/*.ts'];  // Desarrollo siempre usa fuente
})(),
```

**Lógica de Decisión:**

```
┌─────────────────────────────────────┐
│ ¿NODE_ENV = production?             │
└─────────────────────────────────────┘
           │
           ├─ NO → Usa src/migrations/*.ts
           │
           └─ SÍ → ¿Existe dist/migrations/*.js?
                   │
                   ├─ SÍ → Usa dist/migrations/*.js ✅
                   │
                   └─ NO → Usa src/migrations/*.ts (fallback) ⚠️
```

---

## 🔗 Cadena de Dependencias

```
package.json (build script)
    │
    ├─> build:migrations
    │   │
    │   └─> scripts/build-migrations.js
    │       │
    │       └─> Compila: src/migrations/*.ts → dist/migrations/*.js
    │
    └─> Dockerfile (RUN npm run build)
        │
        ├─> Stage Builder: Compila todo
        │
        └─> Stage Production: Copia resultados
            │
            └─> start.sh (CMD)
                │
                └─> npm run migration:run
                    │
                    └─> data-source.ts
                        │
                        └─> Decide: ¿dist/migrations/*.js o src/migrations/*.ts?
```

---

## 📊 Escenarios de Ejecución

### Escenario 1: Build Completo (Ideal)
```
1. npm run build
   ├─> nest build → dist/main.js
   └─> build:migrations → dist/migrations/*.js ✅

2. Docker build
   └─> Copia dist/ (incluye migraciones compiladas)

3. Runtime
   └─> data-source.ts encuentra dist/migrations/*.js
       └─> Usa migraciones compiladas ✅
```

### Escenario 2: Sin Build de Migraciones (Fallback)
```
1. npm run build (sin build:migrations)
   └─> Solo dist/main.js (sin dist/migrations/)

2. Docker build
   ├─> Copia dist/ (sin migraciones)
   └─> Copia src/ (con migraciones fuente)

3. Runtime
   └─> data-source.ts NO encuentra dist/migrations/*.js
       └─> Usa src/migrations/*.ts (fallback) ⚠️
```

### Escenario 3: Desarrollo Local
```
1. npm run start:dev
   └─> data-source.ts siempre usa src/migrations/*.ts
       └─> No necesita compilación ✅
```

---

## ✅ Ventajas de este Diseño

1. **Flexibilidad:**
   - Funciona con migraciones compiladas (producción optimizada)
   - Funciona con migraciones fuente (fallback seguro)

2. **Optimización:**
   - En producción usa JavaScript compilado (más rápido)
   - En desarrollo usa TypeScript (más fácil de debuggear)

3. **Robustez:**
   - Si falla la compilación, aún funciona con fuente
   - Si no hay dist/migrations/, usa fallback automático

4. **Separación de Responsabilidades:**
   - `build-migrations.js` → Compila
   - `data-source.ts` → Decide qué usar
   - `start.sh` → Ejecuta

---

## 🎯 Resumen

| Componente | Función | Cuándo se Ejecuta |
|------------|---------|-------------------|
| `build:migrations` | Compila migraciones TS→JS | Durante `npm run build` |
| `Dockerfile` | Ejecuta build y copia resultados | Al construir la imagen |
| `start.sh` | Ejecuta migraciones en runtime | Al iniciar el contenedor |
| `data-source.ts` | Decide qué migraciones usar | Cuando TypeORM se inicializa |

**Flujo Completo:**
```
Build Time → Runtime → Ejecución
    │           │          │
    │           │          └─> data-source.ts decide
    │           │             └─> Usa dist/migrations/*.js o src/migrations/*.ts
    │           │
    │           └─> start.sh ejecuta npm run migration:run
    │
    └─> build:migrations compila migraciones
```

---

**Generado automáticamente**
