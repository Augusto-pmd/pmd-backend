# 🔵 Variables de Entorno Requeridas para Render

## Variables Obligatorias

Render requiere las siguientes variables de entorno configuradas en el Dashboard:

### 1. PORT
- **Valor:** `8080` (Render asigna automáticamente, pero se puede configurar)
- **Descripción:** Puerto en el que el servidor escuchará
- **Estado:** ✅ Configurado en `main.ts` (usa `process.env.PORT` o default 3000)

### 2. NODE_ENV
- **Valor:** `production`
- **Descripción:** Entorno de ejecución
- **Estado:** ✅ Render lo configura automáticamente

### 3. DATABASE_URL
- **Valor:** `postgresql://user:password@host:port/database?sslmode=require`
- **Descripción:** URL de conexión a PostgreSQL
- **Estado:** ✅ Usado en `src/config/typeorm.config.ts`
- **Nota:** Render proporciona esta variable automáticamente si usas su servicio de PostgreSQL

### 4. JWT_SECRET
- **Valor:** `[tu-secret-jwt-seguro]` (mínimo 32 caracteres)
- **Descripción:** Secret para firmar tokens JWT
- **Estado:** ✅ Usado en `src/auth/auth.module.ts` y `src/auth/strategies/jwt.strategy.ts`
- **Nota:** Debe ser un string seguro y único

### 5. CORS_ORIGIN (Opcional)
- **Valor:** `https://pmd-frontend.vercel.app` o `https://pmd-frontend-bice.vercel.app`
- **Descripción:** Origen permitido para CORS
- **Estado:** ✅ Configurado en `src/main.ts` con múltiples orígenes
- **Nota:** Ya está hardcodeado en el código, pero se puede usar esta variable si se desea

## Variables Opcionales

### JWT_EXPIRATION
- **Valor:** `1d` (default)
- **Descripción:** Tiempo de expiración del access token JWT
- **Estado:** ✅ Usado en `src/auth/auth.service.ts` (login y refresh)
- **Recomendado:** Configurar en Render Dashboard

### JWT_REFRESH_EXPIRATION
- **Valor:** `7d` (default)
- **Descripción:** Tiempo de expiración del refresh token JWT
- **Estado:** ✅ Usado en `src/auth/auth.service.ts` (login y refresh)
- **Recomendado:** Configurar en Render Dashboard

### COOKIE_DOMAIN
- **Valor:** (opcional, para subdominios)
- **Descripción:** Dominio para cookies compartidas
- **Estado:** ✅ Usado en `src/auth/auth.controller.ts`

## ⚠️ Configuración en Render Dashboard

1. Ve a tu servicio en Render Dashboard
2. Navega a **Environment** → **Environment Variables**
3. Agrega las siguientes variables:

```
PORT=8080
NODE_ENV=production
DATABASE_URL=[Render lo proporciona automáticamente si usas PostgreSQL de Render]
JWT_SECRET=[genera un secret seguro de al menos 32 caracteres]
JWT_EXPIRATION=1d
JWT_REFRESH_EXPIRATION=7d
```

## ✅ Verificación

El backend está configurado para usar estas variables:
- ✅ `PORT` - Leído en `src/main.ts`
- ✅ `DATABASE_URL` - Leído en `src/config/typeorm.config.ts`
- ✅ `JWT_SECRET` - Leído en `src/auth/auth.module.ts` y `src/auth/strategies/jwt.strategy.ts`
- ✅ `NODE_ENV` - Usado para CORS y cookies en `src/main.ts` y `src/auth/auth.controller.ts`

## 🔒 Seguridad

**IMPORTANTE:** 
- ❌ NO incluyas valores reales en este archivo
- ❌ NO commitees archivos `.env` con valores reales
- ✅ Usa variables de entorno en Render Dashboard
- ✅ Genera un `JWT_SECRET` seguro y único

