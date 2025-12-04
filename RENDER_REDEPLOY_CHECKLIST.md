# 🔵 RENDER REDEPLOY CHECKLIST - Backend PMD

**Fecha:** $(date)  
**Status:** ✅ **LISTO PARA REDEPLOY**

---

## ✅ PASO 1 - VALIDACIÓN DE BUILD LOCAL

### Comandos Ejecutados:
```bash
npm install
npm run build
```

### Resultado:
- ✅ `npm install` ejecutado sin errores
- ✅ `npm run build` ejecutado sin errores
- ✅ `dist/main.js` generado correctamente
- ✅ Sin errores de TypeScript
- ✅ Sin errores de imports
- ✅ Sin errores de DTOs

---

## ✅ PASO 2 - SCRIPTS DE INICIO VALIDADOS

### package.json Scripts:
```json
{
  "start": "node dist/main.js",
  "start:prod": "node dist/main.js",
  "build": "nest build -p tsconfig.build.json"
}
```

### Estado:
- ✅ `start` existe y es correcto
- ✅ `start:prod` existe y es correcto
- ✅ `build` existe y es correcto

---

## ✅ PASO 3 - PUERTO CONFIGURADO PARA RENDER

### main.ts:
```typescript
const port = configService.get<number>('PORT') || process.env.PORT || 8080;
await app.listen(port);
```

### Estado:
- ✅ Puerto por defecto: `8080` (Render requiere 8080 o 10000)
- ✅ Usa `process.env.PORT` si está definido
- ✅ Render puede asignar puerto automáticamente

---

## ✅ PASO 4 - CORS CONFIGURADO

### main.ts CORS:
```typescript
app.enableCors({
  origin: [
    'http://localhost:3000',
    'https://pmd-frontend-nine.vercel.app',
    'https://pmd-frontend-bice.vercel.app',
    'https://pmd-frontend.vercel.app',
    /\.vercel\.app$/,
    'http://localhost:5173'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false,
});
```

### Estado:
- ✅ Incluye `http://localhost:3000`
- ✅ Incluye `https://pmd-frontend-nine.vercel.app`
- ✅ Incluye regex `/\.vercel\.app$/` para todos los subdominios
- ✅ `credentials: true` habilitado

---

## ✅ PASO 5 - ARCHIVO FORCE REDEPLOY CREADO

### Archivo:
- ✅ `force-redeploy.txt` creado
- ✅ Listo para commit y push

### Comandos para Commit:
```bash
git add force-redeploy.txt
git commit -m "chore: force full redeploy on Render"
git push origin main
```

---

## 📋 CONFIGURACIÓN RENDER DASHBOARD

### Build Command:
```
npm install && npm run build
```

### Start Command:
```
npm start
```
o
```
npm run start:prod
```

### Root Directory:
```
./
```

### Environment Variables (Configurar en Render Dashboard):
```
PORT=8080
NODE_ENV=production
DATABASE_URL=[proporcionado por Render si usas PostgreSQL de Render]
JWT_SECRET=[generar un secret seguro de al menos 32 caracteres]
```

---

## 🔍 LOGS ESPERADOS EN RENDER

Después del redeploy, verificar en Render Dashboard → Logs:

### ✅ Logs Exitosos:
- ✅ `"Nest application successfully started"`
- ✅ `"Listening on port 8080"` (o el puerto asignado)
- ✅ `"Swagger documentation: http://localhost:8080/api/docs"`
- ✅ `"Health check: http://localhost:8080/api/health"`

### ❌ Logs de Error (NO deben aparecer):
- ❌ Errores de TypeORM
- ❌ Errores de DTO
- ❌ "Cannot GET /auth/login"
- ❌ Fallas de cookies
- ❌ Bucles de redirect
- ❌ Errores de compilación

---

## 🧪 TESTING AUTOMÁTICO DEL BACKEND

### 1. Health Check
```bash
GET https://pmd-backend-l47d.onrender.com/api/health
```

**Esperado:**
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "uptime": ...,
  "environment": "production"
}
```

### 2. Login
```bash
POST https://pmd-backend-l47d.onrender.com/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

**Esperado:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "fullName": "Test User",
    "role": "DIRECTION",
    "organizationId": "org-uuid"
  }
}
```

**Headers Esperados:**
- ✅ `Set-Cookie: token=...; SameSite=None; Secure; Path=/; Max-Age=604800`
- ✅ `Content-Type: application/json`
- ✅ Status: `200`

### 3. Refresh
```bash
GET https://pmd-backend-l47d.onrender.com/api/auth/refresh
Authorization: Bearer <access_token>
```

**Esperado:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "fullName": "Test User",
    "role": "DIRECTION",
    "organizationId": "org-uuid"
  }
}
```

**Headers Esperados:**
- ✅ `Set-Cookie: token=...; SameSite=None; Secure; Path=/; Max-Age=604800`
- ✅ `Content-Type: application/json`
- ✅ Status: `200`

---

## ✅ VERIFICACIONES FINALES

### Backend:
- ✅ Build exitoso localmente
- ✅ `dist/main.js` generado
- ✅ Scripts correctos en `package.json`
- ✅ Puerto configurado para Render (8080)
- ✅ CORS configurado correctamente
- ✅ Archivo `force-redeploy.txt` creado
- ✅ Listo para commit y push

### Render:
- ⏳ Build Command configurado
- ⏳ Start Command configurado
- ⏳ Environment Variables configuradas
- ⏳ Esperando redeploy automático

---

## 🚀 PRÓXIMOS PASOS

1. **Commit y Push:**
   ```bash
   git add force-redeploy.txt src/main.ts
   git commit -m "chore: force full redeploy on Render - configure port 8080"
   git push origin main
   ```

2. **Monitorear Render Dashboard:**
   - Verificar que el build se ejecute
   - Verificar logs de inicio
   - Verificar que no haya errores

3. **Testing Post-Deploy:**
   - Probar `/api/health`
   - Probar `/api/auth/login`
   - Probar `/api/auth/refresh`
   - Verificar cookies
   - Verificar CORS

---

**Backend PMD - Listo para Redeploy en Render** ✅

