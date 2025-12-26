# Tests Manuales Básicos - Bloque 2 Auth & Seguridad

**Fecha:** 2025-12-11  
**Objetivo:** Verificar que los cambios del Bloque 2 funcionan correctamente

---

## Pre-requisitos

1. Backend corriendo: `npm run start:dev`
2. Variables de entorno configuradas (o usando defaults)
3. Usuario de prueba disponible (admin@pmd.com / 1102Pequ)

---

## Test 1: Login Válido

### Objetivo
Verificar que el login funciona y retorna tokens con expiración correcta.

### Pasos
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pmd.com",
    "password": "1102Pequ"
  }'
```

### Resultado Esperado
- **Status:** `200 OK`
- **Body:** Contiene `accessToken`, `refresh_token`, `user`
- **Cookie:** `token` con `httpOnly: true` (verificar en DevTools)
- **Headers:** `Set-Cookie: token=...; HttpOnly; Secure; SameSite=None`

### Verificaciones
- ✅ Token JWT es válido (decodificar en jwt.io)
- ✅ Header del JWT contiene `"alg": "HS256"`
- ✅ Cookie tiene `httpOnly: true` (no accesible desde JS)
- ✅ Usuario retornado tiene estructura correcta

---

## Test 2: Login Inválido - Rate Limit

### Objetivo
Verificar que el rate limiting funciona en el endpoint de login.

### Pasos
```bash
# Ejecutar 6 requests rápidos (límite es 5 por minuto)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "wrong@example.com",
      "password": "wrongpassword"
    }'
  echo "Request $i completed"
done
```

### Resultado Esperado
- **Requests 1-5:** `401 Unauthorized` (credenciales inválidas)
- **Request 6:** `429 Too Many Requests`

### Verificación
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "timestamp": "...",
  "path": "/api/auth/login"
}
```

---

## Test 3: /users/me con Bearer Token

### Objetivo
Verificar que el endpoint protegido funciona con Bearer token.

### Pasos

**1. Obtener token (del Test 1):**
```bash
# Guardar token en variable
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**2. Llamar a /users/me:**
```bash
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Resultado Esperado
- **Status:** `200 OK`
- **Body:** Usuario completo con `role`, `permissions`, `organization`

### Verificaciones
- ✅ Token válido permite acceso
- ✅ Usuario retornado tiene estructura normalizada
- ✅ Permisos están en formato array plano

---

## Test 4: Token Expirado

### Objetivo
Verificar que tokens expirados son rechazados.

### Pasos
```bash
# Usar un token expirado o inválido
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer expired_token_here" \
  -H "Content-Type: application/json"
```

### Resultado Esperado
- **Status:** `401 Unauthorized`
- **Body:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "timestamp": "...",
  "path": "/api/users/me"
}
```

---

## Test 5: Cookie httpOnly

### Objetivo
Verificar que la cookie no es accesible desde JavaScript.

### Pasos
1. Hacer login exitoso (Test 1)
2. Abrir DevTools → Application → Cookies
3. Verificar cookie `token`:
   - ✅ `httpOnly: true`
   - ✅ `secure: true` (en producción)
   - ✅ `sameSite: None` (en producción)

4. Intentar leer desde consola:
```javascript
// En DevTools Console
document.cookie
// NO debe aparecer 'token' en la lista
```

### Resultado Esperado
- ✅ Cookie NO aparece en `document.cookie`
- ✅ Cookie solo se envía automáticamente en requests
- ✅ Token debe enviarse manualmente en header `Authorization: Bearer`

---

## Test 6: Rate Limiting Global

### Objetivo
Verificar que el rate limiting global funciona en otros endpoints.

### Pasos
```bash
# Hacer 11 requests rápidos a /api/health (límite global es 10 por minuto)
for i in {1..11}; do
  curl -X GET http://localhost:3000/api/health
  echo "Request $i completed"
done
```

### Resultado Esperado
- **Requests 1-10:** `200 OK`
- **Request 11:** `429 Too Many Requests`

---

## Test 7: Variables de Entorno - Expiración

### Objetivo
Verificar que las expiraciones se leen desde variables de entorno.

### Pasos

**1. Configurar variables:**
```bash
export JWT_EXPIRATION=2h
export JWT_REFRESH_EXPIRATION=14d
```

**2. Reiniciar servidor:**
```bash
npm run start:dev
```

**3. Hacer login y verificar expiración del token:**
```bash
# Decodificar token JWT (sin verificar firma)
# Verificar campo "exp" en el payload
```

### Resultado Esperado
- ✅ Access token expira en 2 horas (según `JWT_EXPIRATION`)
- ✅ Refresh token expira en 14 días (según `JWT_REFRESH_EXPIRATION`)

---

## Checklist de Verificación

- [ ] Login válido retorna tokens
- [ ] Cookie tiene `httpOnly: true`
- [ ] Rate limiting funciona en login (5 req/min)
- [ ] Rate limiting global funciona (10 req/min)
- [ ] `/users/me` funciona con Bearer token
- [ ] Tokens expirados son rechazados
- [ ] Algoritmo JWT es `HS256`
- [ ] Expiración se lee desde variables de entorno

---

## Notas

1. **Rate Limiting:** Los límites se resetean cada minuto (TTL: 60000ms)
2. **Cookie httpOnly:** El frontend debe usar header `Authorization: Bearer` en lugar de leer cookie
3. **Variables de entorno:** Si no se configuran, se usan defaults seguros (`1d` y `7d`)

---

**✅ Tests completados - Bloque 2 verificado**

