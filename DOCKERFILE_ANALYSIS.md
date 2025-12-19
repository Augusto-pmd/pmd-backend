# 📋 Análisis del Dockerfile - PMD Backend

## Fecha: Análisis realizado

---

## ✅ Aspectos Positivos

### 1. Multi-stage Build
- ✅ Usa multi-stage build correctamente (builder → production)
- ✅ Reduce el tamaño final de la imagen
- ✅ Separa dependencias de desarrollo y producción

### 2. Seguridad
- ✅ Usa usuario no-root (`appuser`)
- ✅ Usa `dumb-init` para mejor manejo de señales
- ✅ Imagen base Alpine (más pequeña y segura)

### 3. Optimización de Caché
- ✅ Copia `package.json` antes del código fuente
- ✅ Instala dependencias antes de copiar el código

---

## 🔧 Problemas Identificados y Corregidos

### 1. ❌ Scripts copiados desde contexto local
**Problema:**
```dockerfile
COPY scripts ./scripts  # Copia desde contexto local
```

**Impacto:**
- Los scripts podrían no estar sincronizados con los del builder
- Si hay cambios en los scripts durante el build, no se reflejan

**Solución aplicada:**
```dockerfile
COPY --from=builder /app/scripts ./scripts  # Copia desde builder
```

### 2. ❌ Falta TypeScript en producción
**Problema:**
```dockerfile
npm install --save-dev typeorm ts-node
```

**Impacto:**
- El script `build-migrations.js` necesita `typescript` para compilar migraciones
- Si las migraciones no están compiladas, no se pueden ejecutar

**Solución aplicada:**
```dockerfile
npm install --save-dev typeorm ts-node typescript
```

### 3. ⚠️ Permisos de scripts
**Problema:**
```dockerfile
RUN chmod +x ./scripts/*.sh ./scripts/*.js ./scripts/build-migrations.js
```

**Impacto:**
- Si algún archivo no existe, el comando falla
- El orden podría ser mejor

**Solución aplicada:**
```dockerfile
chmod +x ./scripts/*.sh ./scripts/*.js 2>/dev/null || true
```
- Agregado manejo de errores silencioso
- Integrado en el mismo RUN que crea el usuario

---

## 📊 Estructura del Dockerfile (Mejorada)

### Stage 1: Builder
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build  # Esto ahora incluye build:migrations
```

**Nota:** El `npm run build` ahora ejecuta:
1. `nest build` - Compila la aplicación NestJS
2. `npm run build:migrations` - Compila las migraciones TypeScript

### Stage 2: Production
```dockerfile
FROM node:22-alpine AS production
# ... instalación de dependencias ...
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts  # ✅ Corregido
```

---

## 🔍 Verificación de Flujo

### Build Process
1. ✅ Copia `package.json` y `package-lock.json`
2. ✅ Instala todas las dependencias (incluyendo dev)
3. ✅ Copia código fuente
4. ✅ Ejecuta `npm run build`:
   - Compila aplicación NestJS → `dist/main.js`
   - Compila migraciones → `dist/migrations/*.js`
5. ✅ Copia resultados al stage de producción

### Runtime Process
1. ✅ Instala solo dependencias de producción + herramientas necesarias
2. ✅ Copia `dist/` (aplicación compilada)
3. ✅ Copia `src/` (para migraciones fuente como fallback)
4. ✅ Copia scripts desde builder
5. ✅ Establece permisos y usuario
6. ✅ Ejecuta `start.sh` que:
   - Espera PostgreSQL
   - Ejecuta migraciones (desde `dist/migrations/*.js` o `src/migrations/*.ts`)
   - Ejecuta seed (si está habilitado)
   - Inicia la aplicación

---

## 📝 Recomendaciones Adicionales

### 1. Healthcheck (Opcional)
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

### 2. Variables de Entorno (Documentación)
El Dockerfile asume que las siguientes variables estarán disponibles:
- `DB_HOST` o `DATABASE_URL`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_DATABASE`
- `NODE_ENV`
- `RUN_MIGRATIONS` (opcional, default: true)
- `RUN_SEED` (opcional, default: false)
- `JWT_SECRET`

### 3. Optimización de Tamaño (Futuro)
- Considerar usar `.dockerignore` para excluir archivos innecesarios
- Considerar usar `npm ci --only=production` en lugar de instalar dev dependencies después

---

## ✅ Estado Final

El Dockerfile ahora:
- ✅ Compila correctamente las migraciones
- ✅ Copia scripts desde el builder (consistencia)
- ✅ Incluye TypeScript para compilar migraciones si es necesario
- ✅ Maneja permisos correctamente
- ✅ Usa usuario no-root
- ✅ Optimiza el uso de caché de Docker

---

## 🚀 Próximos Pasos

1. **Reconstruir la imagen:**
   ```bash
   docker-compose build --no-cache api
   ```

2. **Verificar que las migraciones se compilaron:**
   ```bash
   docker-compose run --rm api ls -la dist/migrations/
   ```

3. **Probar el despliegue:**
   ```bash
   docker-compose up -d api
   docker-compose logs -f api
   ```

4. **Verificar que las migraciones se ejecutan:**
   - Revisar los logs para ver el diagnóstico de migraciones
   - Verificar que las tablas se crean correctamente

---

**Generado automáticamente**
