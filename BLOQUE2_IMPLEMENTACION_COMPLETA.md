# IMPLEMENTACIÓN BLOQUE 2 — AUTH & SEGURIDAD

**Fecha:** 2025-12-11  
**Estado:** ✅ COMPLETADO

---

## Cambios Implementados

### 1. ✅ Expiración por ENV

#### `auth.module.ts`
- ✅ Agregado algoritmo explícito `HS256` en `signOptions`
- ✅ Mantiene uso de `JWT_EXPIRATION` desde `process.env` con fallback `'1d'`

**Cambio:**
```typescript
signOptions: { 
  algorithm: 'HS256',  // ← AGREGADO
  expiresIn: configService.get<string>('JWT_EXPIRATION', '1d'),
},
```

#### `auth.service.ts`
- ✅ Agregado `ConfigService` al constructor
- ✅ Reemplazado `'1d'` hardcodeado por `JWT_EXPIRATION` desde env
- ✅ Reemplazado `'7d'` hardcodeado por `JWT_REFRESH_EXPIRATION` desde env
- ✅ Aplicado en métodos `login()` y `refresh()`

**Cambios:**
```typescript
// Constructor
constructor(
  // ... otros parámetros
  private readonly configService: ConfigService,  // ← AGREGADO
) {}

// En login() y refresh()
const accessTokenExpiration = this.configService.get<string>('JWT_EXPIRATION', '1d');
const refreshTokenExpiration = this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');

return {
  accessToken: await this.jwtService.signAsync(payload, { expiresIn: accessTokenExpiration }),
  refresh_token: await this.jwtService.signAsync(payload, { expiresIn: refreshTokenExpiration }),
  // ...
};
```

**Variables de entorno:**
- `JWT_EXPIRATION` (default: `'1d'`) - Para access token
- `JWT_REFRESH_EXPIRATION` (default: `'7d'`) - Para refresh token

---

### 2. ✅ Cookie Segura

#### `auth.controller.ts`
- ✅ Cambiado `httpOnly: false` → `httpOnly: true` en método `login()`
- ✅ Cambiado `httpOnly: false` → `httpOnly: true` en método `refresh()`
- ✅ Mantiene `secure` y `sameSite` según entorno

**Cambios:**
```typescript
// En login()
res.cookie('token', accessToken, {
  httpOnly: true,  // ← CAMBIADO de false
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  path: '/',
  maxAge: 604800000
});

// En refresh()
res.cookie('token', result.access_token, {
  httpOnly: true,  // ← CAMBIADO de false
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/',
  maxAge: 604800000,
});
```

**Nota:** La cookie ahora es `httpOnly: true`, lo que significa que no es accesible desde JavaScript. El token debe enviarse en el header `Authorization: Bearer <token>` (como ya está configurado en `JwtStrategy`).

---

### 3. ✅ Rate Limiting en Login

#### Dependencia instalada
- ✅ `@nestjs/throttler` agregado a `package.json`

#### `app.module.ts`
- ✅ Importado `ThrottlerModule` y `ThrottlerGuard`
- ✅ Configurado `ThrottlerModule` global con:
  - `ttl: 60000` (1 minuto)
  - `limit: 10` (10 requests por minuto)
- ✅ Agregado `ThrottlerGuard` como `APP_GUARD` global

**Cambios:**
```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    // ...
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 10, // 10 requests per minute
    }]),
    // ...
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
```

#### `auth.controller.ts`
- ✅ Agregado `@Throttle()` decorator a `POST /auth/login`
- ✅ Configuración específica: 5 requests por minuto para login
- ✅ Agregado `@ApiResponse({ status: 429 })` en Swagger

**Cambios:**
```typescript
import { Throttle } from '@nestjs/throttler';

@Post('login')
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute for login
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'User login' })
@ApiResponse({ status: 429, description: 'Too many requests' })  // ← AGREGADO
async login(@Body() dto: LoginDto, @Res() res: Response) {
  // ...
}
```

**Configuración de rate limiting:**
- **Global:** 10 requests por minuto (todos los endpoints)
- **Login específico:** 5 requests por minuto (más restrictivo)

**Respuesta cuando se excede el límite:**
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/auth/login"
}
```

---

### 4. ✅ Algoritmo Explícito

#### `auth.module.ts`
- ✅ Agregado `algorithm: 'HS256'` explícitamente en `signOptions`

**Cambio:**
```typescript
signOptions: { 
  algorithm: 'HS256',  // ← AGREGADO (explícito)
  expiresIn: configService.get<string>('JWT_EXPIRATION', '1d'),
},
```

---

## Resumen de Archivos Modificados

1. ✅ `src/auth/auth.module.ts` - Algoritmo HS256 explícito
2. ✅ `src/auth/auth.service.ts` - Expiración desde env, ConfigService agregado
3. ✅ `src/auth/auth.controller.ts` - Cookie httpOnly: true, rate limiting en login
4. ✅ `src/app.module.ts` - ThrottlerModule global configurado
5. ✅ `package.json` - Dependencia @nestjs/throttler agregada

---

## Variables de Entorno Requeridas

### Nuevas/Opcionales:
- `JWT_REFRESH_EXPIRATION` (opcional, default: `'7d'`) - Expiración del refresh token

### Existentes (ahora usadas):
- `JWT_EXPIRATION` (opcional, default: `'1d'`) - Expiración del access token
- `JWT_SECRET` (requerido) - Secreto para firmar tokens

---

## Verificaciones Realizadas

- ✅ Sin errores de linter
- ✅ Imports correctos
- ✅ Tipos correctos
- ✅ Configuración consistente

---

## Testing Manual Recomendado

### 1. Verificar expiración desde env:
```bash
# Con JWT_EXPIRATION=2h
JWT_EXPIRATION=2h npm run start:dev
# Login y verificar que el token expira en 2 horas
```

### 2. Verificar cookie httpOnly:
```javascript
// En DevTools → Application → Cookies
// Verificar que cookie 'token' tiene httpOnly: true
// Intentar leer desde JS: document.cookie → NO debe aparecer 'token'
```

### 3. Verificar rate limiting:
```bash
# Hacer 6 requests rápidos a POST /api/auth/login
# El 6to debe retornar 429 Too Many Requests
```

### 4. Verificar algoritmo JWT:
```javascript
// Decodificar token JWT (sin verificar firma)
// Verificar que header contiene: { "alg": "HS256", "typ": "JWT" }
```

---

## Notas Importantes

1. **Cookie httpOnly: true**
   - El frontend NO puede leer la cookie desde JavaScript
   - El token debe enviarse en header `Authorization: Bearer <token>`
   - Esto es más seguro contra XSS

2. **Rate Limiting**
   - Aplica a TODOS los endpoints (10 req/min global)
   - Login tiene límite más restrictivo (5 req/min)
   - Puede ajustarse según necesidades

3. **Expiración desde ENV**
   - Si no se configuran variables, usa defaults seguros (`1d` y `7d`)
   - Permite flexibilidad sin hardcodear valores

4. **Algoritmo Explícito**
   - HS256 es el default, pero ahora está explícito
   - Facilita auditorías y documentación

---

## Próximos Pasos (Opcional)

1. Agregar `JWT_REFRESH_EXPIRATION` a `env.example`
2. Documentar rate limiting en Swagger
3. Considerar ajustar límites según uso real
4. Monitorear logs de rate limiting en producción

---

**✅ IMPLEMENTACIÓN COMPLETA - LISTO PARA TESTING**

