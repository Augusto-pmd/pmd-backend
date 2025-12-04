# Configuración Exacta de Render para Backend NestJS

## Fecha: 1 de Diciembre, 2025

## Análisis del Proyecto

### Estructura Verificada
- ✅ `package.json` en la raíz del proyecto
- ✅ `src/main.ts` - Punto de entrada del código fuente
- ✅ `dist/main.js` - Archivo compilado generado por el build
- ✅ `tsconfig.build.json` - Configuración de build con `rootDir: "./src"` y `outDir: "./dist"`
- ✅ `nest-cli.json` - Configuración de NestJS CLI

### Scripts en package.json
- ✅ `"build": "nest build -p tsconfig.build.json"` - Genera `dist/main.js`
- ✅ `"start:prod": "node dist/main.js"` - Ejecuta el archivo compilado

---

## CONFIGURACIÓN EXACTA PARA RENDER

### 1. ROOT_DIRECTORY

**Valor**: `.` (punto, raíz del repositorio)

**Razón**: 
- El `package.json` está en la raíz del repositorio
- Todos los archivos de configuración (`nest-cli.json`, `tsconfig.json`, `tsconfig.build.json`) están en la raíz
- El comando `npm run build` debe ejecutarse desde la raíz donde está `package.json`
- Render necesita acceder a `package.json` para instalar dependencias y ejecutar scripts

**En Render Dashboard**:
- Dejar **vacío** o poner `.` (punto)
- Render detectará automáticamente la raíz si está vacío

---

### 2. BUILD_COMMAND

**Valor**: `npm install && npm run build`

**Razón**:
- `npm install` instala todas las dependencias necesarias (incluyendo `@nestjs/cli` en devDependencies)
- `npm run build` ejecuta `nest build -p tsconfig.build.json` que compila TypeScript a JavaScript
- El build genera `dist/main.js` que es el archivo que se ejecutará en producción
- El `&&` asegura que el build solo se ejecute si la instalación fue exitosa

**Alternativa (si Render ya ejecuta npm install automáticamente)**:
- `npm run build`

**Recomendación**: Usar `npm install && npm run build` para asegurar que todas las dependencias estén instaladas antes del build.

---

### 3. START_COMMAND

**Valor**: `npm run start:prod`

**Razón**:
- `package.json` tiene el script `"start:prod": "node dist/main.js"`
- Usar `npm run start:prod` es más mantenible que `node dist/main.js` directamente
- Si en el futuro cambia la forma de iniciar, solo se modifica `package.json`
- Es la práctica estándar en proyectos Node.js/NestJS

**Alternativa (también funciona)**:
- `node dist/main.js`

**Recomendación**: Usar `npm run start:prod` para mantener consistencia con el proyecto.

---

### 4. NODE_VERSION

**Valor Recomendado**: `20.x` o `18.x`

**Razón**:
- El proyecto usa `@types/node: "^20.3.1"` en devDependencies
- NestJS 10.x requiere Node.js 18.x o superior
- Node.js 20.x es LTS (Long Term Support) y es la versión más estable actualmente
- Node.js 18.x también es LTS y funciona perfectamente

**En Render Dashboard**:
- Seleccionar **Node Version**: `20` o `18`
- Render usará la última versión patch de la serie seleccionada (ej: 20.11.0)

**Recomendación**: Usar **Node 20** para mejor compatibilidad con las dependencias actuales.

---

### 5. ENVIRONMENT VARIABLES

**Variables Requeridas** (según el código):

1. **DATABASE_URL** (obligatorio)
   - URL de conexión a PostgreSQL
   - Formato: `postgresql://user:password@host:port/database`

2. **JWT_SECRET** (opcional, tiene default)
   - Secreto para firmar tokens JWT
   - Default: `'supersecret123'` (cambiar en producción)

3. **JWT_EXPIRATION** (opcional, tiene default)
   - Tiempo de expiración de tokens
   - Default: `'1d'` (1 día)

4. **PORT** (opcional, tiene default)
   - Puerto donde escucha el servidor
   - Default: `3000`
   - Render asigna automáticamente un puerto, pero el código lo respeta

5. **NODE_ENV** (opcional)
   - Ambiente de ejecución
   - Valores: `development`, `production`, `test`
   - Render puede establecerlo automáticamente

6. **COOKIE_DOMAIN** (opcional)
   - Dominio para cookies (si se necesita compartir entre subdominios)

**Configuración en Render**:
- Ir a **Environment** en el servicio
- Agregar cada variable con su valor correspondiente

---

## EJEMPLO DE CONFIGURACIÓN COMPLETA EN RENDER DASHBOARD

### Paso 1: Crear/Editar Servicio Web

1. Ir a https://dashboard.render.com
2. Seleccionar el servicio `pmd-backend-l47d` o crear uno nuevo
3. Ir a **Settings**

### Paso 2: Configurar Build & Deploy

**Build Command**:
```
npm install && npm run build
```

**Start Command**:
```
npm run start:prod
```

### Paso 3: Configurar Environment

**Node Version**:
```
20
```

**Root Directory**:
```
.
```
(O dejar vacío - Render lo detecta automáticamente)

### Paso 4: Configurar Environment Variables

Agregar en la sección **Environment Variables**:

| Key | Value | Required |
|-----|-------|----------|
| `DATABASE_URL` | `postgresql://...` | ✅ Sí |
| `JWT_SECRET` | `tu-secreto-super-seguro` | ⚠️ Recomendado |
| `JWT_EXPIRATION` | `1d` | ❌ Opcional |
| `NODE_ENV` | `production` | ⚠️ Recomendado |
| `PORT` | (Render lo asigna) | ❌ Opcional |

### Paso 5: Guardar y Deploy

1. Click en **Save Changes**
2. Render iniciará automáticamente un nuevo deploy
3. Verificar logs para confirmar que:
   - `npm install` se ejecuta correctamente
   - `npm run build` genera `dist/main.js`
   - `npm run start:prod` inicia el servidor

---

## VERIFICACIÓN DE PATHS

### Path Absoluto de dist/main.js
```
C:\Users\augus\OneDrive\Escritorio\veamos cursor\dist\main.js
```

### Path Relativo desde la Raíz del Repo
```
dist/main.js
```

### Comando Exacto que Ejecuta el Archivo
```bash
node dist/main.js
```

O usando npm:
```bash
npm run start:prod
```

---

## FLUJO DE EJECUCIÓN EN RENDER

1. **Render clona el repositorio**
   - Detecta la raíz del proyecto (donde está `package.json`)

2. **Render ejecuta Build Command**
   ```bash
   npm install && npm run build
   ```
   - Instala dependencias en `node_modules/`
   - Ejecuta `nest build -p tsconfig.build.json`
   - Compila `src/**/*.ts` → `dist/**/*.js`
   - Genera `dist/main.js`

3. **Render ejecuta Start Command**
   ```bash
   npm run start:prod
   ```
   - Ejecuta `node dist/main.js`
   - El servidor NestJS inicia
   - Escucha en el puerto asignado por Render

4. **Render expone el servicio**
   - Asigna una URL pública (ej: `https://pmd-backend-l47d.onrender.com`)
   - El servidor responde en `/api/*` (por el `app.setGlobalPrefix('api')`)

---

## TROUBLESHOOTING

### Si el build falla:

1. **Verificar logs de Render**
   - Ir a **Logs** en el servicio
   - Buscar errores de compilación TypeScript

2. **Verificar que todas las dependencias estén en package.json**
   - `@nestjs/cli` debe estar en `devDependencies`

3. **Verificar tsconfig.build.json**
   - Debe tener `rootDir: "./src"` y `outDir: "./dist"`

### Si el start falla:

1. **Verificar que dist/main.js existe después del build**
   - Revisar logs del build
   - Debe aparecer "Build completed successfully"

2. **Verificar variables de entorno**
   - `DATABASE_URL` debe estar configurada
   - Verificar que la base de datos esté accesible

3. **Verificar puerto**
   - El código usa `process.env.PORT || 3000`
   - Render asigna automáticamente el puerto

---

## RESUMEN FINAL

### Configuración Mínima Requerida

```
ROOT_DIRECTORY: . (o vacío)
BUILD_COMMAND: npm install && npm run build
START_COMMAND: npm run start:prod
NODE_VERSION: 20
```

### Archivos Clave

- **Código fuente**: `src/main.ts`
- **Archivo compilado**: `dist/main.js`
- **Configuración build**: `tsconfig.build.json`
- **Scripts**: `package.json`

### Verificación Local

Para verificar que todo funciona localmente:

```bash
# 1. Build
npm run build

# 2. Verificar que dist/main.js existe
ls dist/main.js  # Linux/Mac
dir dist\main.js  # Windows

# 3. Ejecutar
npm run start:prod
# o
node dist/main.js
```

---

**Generado automáticamente el**: 1 de Diciembre, 2025

