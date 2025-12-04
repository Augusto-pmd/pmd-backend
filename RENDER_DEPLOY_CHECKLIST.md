# 🔵 RENDER DEPLOY CHECKLIST - Backend PMD

## ✅ Pre-Deploy Checklist

### 1. Build Local ✅
- [x] `npm install` ejecutado sin errores
- [x] `npm run build` ejecutado sin errores
- [x] `dist/main.js` generado correctamente
- [x] Sin errores de TypeScript
- [x] Sin errores de imports

### 2. Scripts de Inicio ✅
- [x] `package.json` tiene `"start": "node dist/main.js"`
- [x] `package.json` tiene `"start:prod": "node dist/main.js"`
- [x] `package.json` tiene `"build": "nest build -p tsconfig.build.json"`

### 3. Variables de Entorno ✅
- [x] `PORT` - Configurado (usa `process.env.PORT` o default 3000)
- [x] `NODE_ENV` - Render lo configura automáticamente
- [x] `DATABASE_URL` - Usado en `typeorm.config.ts`
- [x] `JWT_SECRET` - Usado en `auth.module.ts` y `jwt.strategy.ts`
- [x] CORS configurado con múltiples orígenes

**⚠️ ACCIÓN REQUERIDA:** Configurar en Render Dashboard:
- `JWT_SECRET` (generar un secret seguro de al menos 32 caracteres)
- `DATABASE_URL` (si no usas PostgreSQL de Render)

### 4. CORS ✅
- [x] `app.enableCors()` configurado en `main.ts`
- [x] Orígenes incluidos:
  - `https://pmd-frontend-bice.vercel.app`
  - `https://pmd-frontend.vercel.app`
  - `/\.vercel\.app$/` (regex para todos los subdominios)
  - `http://localhost:3000`
  - `http://localhost:5173`
- [x] `credentials: true` habilitado

### 5. Health Check ✅
- [x] Endpoint `GET /api/health` creado
- [x] Retorna `{ status: 'ok', timestamp, uptime, environment }`
- [x] Sin autenticación requerida
- [x] Documentado en Swagger

### 6. Endpoints Críticos ✅
- [x] `POST /api/auth/login` - Devuelve `organizationId` y `organization`
- [x] `GET /api/auth/refresh` - Devuelve `organizationId` y `organization`
- [x] JWT Strategy incluye `organizationId` en payload
- [x] Todos los endpoints autenticados tienen acceso a `req.user.organizationId`

---

## 🚀 Configuración Render Dashboard

### Build Command
```
npm install && npm run build
```

### Start Command
```
npm run start:prod
```

O simplemente:
```
npm start
```

### Root Directory
```
./
```
(raíz del repositorio)

### Environment Variables
Configurar en Render Dashboard → Environment:

```
PORT=8080
NODE_ENV=production
DATABASE_URL=[proporcionado por Render si usas PostgreSQL de Render]
JWT_SECRET=[generar un secret seguro de al menos 32 caracteres]
```

### Node Version
```
18.x o superior
```

---

## 📋 Post-Deploy Verification

Después del deploy, verificar:

1. **Health Check:**
   ```bash
   curl https://pmd-backend-l47d.onrender.com/api/health
   ```
   Debe retornar: `{ "status": "ok", "timestamp": "...", "uptime": ..., "environment": "production" }`

2. **Login:**
   ```bash
   curl -X POST https://pmd-backend-l47d.onrender.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```
   Debe retornar: `{ "user": { ..., "organizationId": "...", "organization": {...} }, "access_token": "...", "refresh_token": "..." }`

3. **Swagger:**
   ```
   https://pmd-backend-l47d.onrender.com/api/docs
   ```
   Debe cargar la documentación Swagger

4. **Logs de Render:**
   - Buscar: `"Nest application successfully started"`
   - Buscar: `"Listening on port 8080"` (o el puerto asignado)
   - Verificar que NO hay errores de TypeORM
   - Verificar que NO hay errores de DTO
   - Verificar que NO hay errores de token
   - Verificar que NO hay errores de organizationId

---

## ✅ Status Final

- ✅ Build exitoso
- ✅ Scripts correctos
- ✅ CORS configurado
- ✅ Health check creado
- ✅ Variables de entorno documentadas
- ✅ Listo para commit y push

**Próximo paso:** Ejecutar commit y push para trigger el redeploy en Render.

