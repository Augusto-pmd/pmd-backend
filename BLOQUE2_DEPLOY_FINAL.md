# Bloque 2 - Pasos Finales de Deploy

**Fecha:** 2025-12-11  
**Estado:** ✅ Cambios implementados - Listo para deploy

---

## ✅ Cambios Implementados

1. ✅ Expiración por ENV (`JWT_EXPIRATION`, `JWT_REFRESH_EXPIRATION`)
2. ✅ Cookie segura (`httpOnly: true`)
3. ✅ Rate limiting (ThrottlerModule global + login específico)
4. ✅ Algoritmo HS256 explícito

---

## 📋 Pasos para Cerrar Bloque 2

### 1) Variables de Entorno (Render Dashboard)

**Acción requerida:** Configurar en Render Dashboard → Environment Variables

```
JWT_EXPIRATION=1d
JWT_REFRESH_EXPIRATION=7d
```

**Nota:** Si no se configuran, se usan defaults seguros (`1d` y `7d`).

---

### 2) Build Local

**Ejecutar desde `pmd-backend/`:**

```bash
cd pmd-backend
npm install
npm run build
```

**Verificar:**
- ✅ `dist/main.js` generado
- ✅ Sin errores de compilación
- ✅ Sin errores de TypeScript

---

### 3) Tests Manuales Básicos

**Ver guía completa:** `BLOQUE2_TESTS_MANUALES.md`

**Tests mínimos recomendados:**

#### Test 1: Login Válido
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@pmd.com", "password": "1102Pequ"}'
```

**Verificar:**
- ✅ Status 200
- ✅ Cookie tiene `httpOnly: true` (en DevTools)
- ✅ Token JWT contiene `"alg": "HS256"`

#### Test 2: Rate Limit en Login
```bash
# Ejecutar 6 requests rápidos
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "wrong@example.com", "password": "wrong"}'
done
```

**Verificar:**
- ✅ Request 6 retorna `429 Too Many Requests`

#### Test 3: /users/me con Bearer
```bash
# Obtener token del Test 1
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

**Verificar:**
- ✅ Status 200
- ✅ Usuario retornado correctamente

---

### 4) Commit

**Ejecutar desde raíz del repositorio:**

```bash
git status
git add pmd-backend/
git commit -m "SECURITY: cerrar BLOQUE 2 auth (ENV expirations, httpOnly cookie, rate limit, HS256 explicit)"
```

**Archivos modificados:**
- `pmd-backend/src/auth/auth.module.ts`
- `pmd-backend/src/auth/auth.service.ts`
- `pmd-backend/src/auth/auth.controller.ts`
- `pmd-backend/src/app.module.ts`
- `pmd-backend/package.json`
- `pmd-backend/env.example`
- `pmd-backend/RENDER_ENV_VARIABLES.md`
- `pmd-backend/BLOQUE2_IMPLEMENTACION_COMPLETE.md`
- `pmd-backend/BLOQUE2_TESTS_MANUALES.md`
- `pmd-backend/BLOQUE2_DEPLOY_FINAL.md`

---

### 5) Push

```bash
git push origin main
```

**Verificar:**
- ✅ Push exitoso
- ✅ Cambios visibles en repositorio remoto

---

### 6) Deploy (Render Dashboard - Manual)

**Pasos en Render Dashboard:**

1. **Ir a:** https://dashboard.render.com
2. **Seleccionar servicio:** `pmd-backend-l47d` (o el nombre de tu servicio)
3. **Ir a:** Settings → Environment Variables
4. **Agregar/Verificar variables:**
   ```
   JWT_EXPIRATION=1d
   JWT_REFRESH_EXPIRATION=7d
   ```
5. **Ir a:** Manual Deploy → Deploy latest commit
6. **Monitorear logs:**
   - ✅ Build exitoso
   - ✅ `npm install` ejecutado
   - ✅ `npm run build` ejecutado
   - ✅ `npm start` iniciado
   - ✅ Sin errores de compilación

**Verificación post-deploy:**

```bash
# Health check
curl https://pmd-backend-l47d.onrender.com/api/health

# Login test
curl -X POST https://pmd-backend-l47d.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@pmd.com", "password": "1102Pequ"}'
```

---

## ✅ Checklist Final

- [ ] Variables de entorno configuradas en Render
- [ ] Build local exitoso
- [ ] Tests manuales básicos pasados
- [ ] Commit realizado
- [ ] Push realizado
- [ ] Deploy manual en Render iniciado
- [ ] Logs de deploy verificados
- [ ] Tests post-deploy pasados

---

## 📝 Notas Importantes

1. **Cookie httpOnly: true**
   - El frontend NO puede leer la cookie desde JavaScript
   - El token debe enviarse en header `Authorization: Bearer <token>`
   - Verificar que el frontend esté actualizado para usar header en lugar de cookie

2. **Rate Limiting**
   - Global: 10 requests/minuto (todos los endpoints)
   - Login: 5 requests/minuto (más restrictivo)
   - Los límites se resetean cada minuto

3. **Variables de Entorno**
   - Si no se configuran, se usan defaults seguros
   - Recomendado configurar en producción para flexibilidad

4. **Algoritmo HS256**
   - Ahora está explícito en la configuración
   - Facilita auditorías y documentación

---

## 🔗 Documentación Relacionada

- `BLOQUE2_IMPLEMENTACION_COMPLETE.md` - Detalles técnicos de implementación
- `BLOQUE2_TESTS_MANUALES.md` - Guía completa de tests
- `AUDITORIA_BLOQUE2_BACKEND_AUTH_SEGURIDAD.md` - Auditoría original

---

**✅ BLOQUE 2 COMPLETADO - LISTO PARA DEPLOY**

