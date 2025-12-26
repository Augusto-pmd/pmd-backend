# Variables de Entorno Requeridas en Render (BLOQUE 2)

## Variables JWT (REQUERIDAS)

Asegurar que estas variables estén configuradas en el Dashboard de Render:

```
JWT_EXPIRATION=1d
JWT_REFRESH_EXPIRATION=7d
```

### Cómo verificar/agregar en Render:

1. Ir al Dashboard de Render
2. Seleccionar el servicio `pmd-backend`
3. Ir a la sección **Environment**
4. Verificar que existan:
   - `JWT_EXPIRATION=1d`
   - `JWT_REFRESH_EXPIRATION=7d`
5. Si no existen, agregarlas y hacer **Save Changes**
6. El servicio se redeployará automáticamente

### Valores por defecto (fallback en código):

Si las variables no están definidas, el código usa:
- `JWT_EXPIRATION`: `'1d'` (1 día)
- `JWT_REFRESH_EXPIRATION`: `'7d'` (7 días)

---

## Tests Manuales Básicos

### 1. Login válido

```bash
curl -X POST https://pmd-backend.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pmd.com",
    "password": "1102Pequ"
  }'
```

**Esperado:**
- Status: `200 OK`
- Response con `accessToken`, `refresh_token`, `user`
- Cookie `token` con `HttpOnly: true`

### 2. Login inválido (rate limit)

Hacer 6+ requests rápidos con credenciales inválidas:

```bash
for i in {1..6}; do
  curl -X POST https://pmd-backend.onrender.com/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "invalid@test.com",
      "password": "wrong"
    }'
  echo ""
done
```

**Esperado:**
- Primeros 5 requests: `401 Unauthorized`
- 6to request en adelante: `429 Too Many Requests`

### 3. /auth/me con Bearer token

```bash
# Primero obtener token del login
TOKEN="<accessToken del login>"

curl -X GET https://pmd-backend.onrender.com/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Esperado:**
- Status: `200 OK`
- Response con `user` completo (incluye role, permissions, organization)

---

## Verificación de Implementación

### ✅ Cambios implementados:

1. **Expiración por ENV**: `auth.module.ts` y `auth.service.ts` usan `process.env.JWT_EXPIRATION` y `process.env.JWT_REFRESH_EXPIRATION`
2. **Cookie segura**: `httpOnly: true` en `auth.controller.ts` (login y refresh)
3. **Rate limiting**: `@Throttle` aplicado a `POST /auth/login` (5 requests/minuto)
4. **Algoritmo explícito**: `HS256` declarado explícitamente en `JwtModule.registerAsync`

### 📦 Dependencia agregada:

- `@nestjs/throttler@6.5.0` (instalada en `package.json`)

---

## Próximos pasos

1. ✅ Verificar variables de entorno en Render Dashboard
2. ✅ Hacer deploy manual desde Render Dashboard (si no es automático)
3. ✅ Ejecutar tests manuales básicos
4. ✅ Verificar logs de Render para confirmar que el servicio inicia correctamente

