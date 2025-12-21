# 🔍 AUDITORÍA POST-FIX: Permisos en Payload de Autenticación

**Fecha:** 2025-01-XX  
**Objetivo:** Verificar que `role.permissions` se envía correctamente al frontend después del fix

---

## ✅ CAMBIOS APLICADOS EN BACKEND

### 1. Helper `normalizeUser` corregido
- **Archivo:** `src/common/helpers/normalize-user.helper.ts`
- **Cambio:** Conversión de `permissions` de objeto JSONB a array plano de strings
- **Formato esperado:** `["users.create", "users.read", "expenses.create", ...]`

### 2. Logs de auditoría agregados
- **Archivos modificados:**
  - `src/auth/auth.service.ts` (métodos: `login()`, `refresh()`, `loadMe()`)
  - `src/common/helpers/normalize-user.helper.ts`

---

## 📋 PASOS DE AUDITORÍA

### BACKEND: Verificar logs en consola

#### 1. Login (`POST /api/auth/login`)

**Logs esperados:**
```
[AUTH LOGIN] role.permissions before normalize: { "users": ["create", "read"], ... }
[NORMALIZE_USER] Original permissions type: object, Converted length: 15
[AUTH LOGIN] normalizedUser.role.permissions: ["users.create", "users.read", ...]
```

**Verificar:**
- ✅ `role.permissions before normalize` muestra el objeto original desde BD
- ✅ `Converted length` es > 0
- ✅ `normalizedUser.role.permissions` es un array con strings

#### 2. LoadMe (`GET /api/users/me` o `GET /api/auth/me`)

**Logs esperados:**
```
[AUTH LOADME] role.permissions before normalize: { "users": ["create", "read"], ... }
[NORMALIZE_USER] Original permissions type: object, Converted length: 15
[AUTH LOADME] normalizedUser.role.permissions: ["users.create", "users.read", ...]
```

**Verificar:**
- ✅ `role.permissions before normalize` muestra el objeto original
- ✅ `Converted length` es > 0
- ✅ `normalizedUser.role.permissions` es un array con strings

#### 3. Refresh (`GET /api/auth/refresh`)

**Logs esperados:**
```
[AUTH REFRESH] role.permissions before normalize: { "users": ["create", "read"], ... }
[NORMALIZE_USER] Original permissions type: object, Converted length: 15
[AUTH REFRESH] normalizedUser.role.permissions: ["users.create", "users.read", ...]
```

**Verificar:**
- ✅ `role.permissions before normalize` muestra el objeto original
- ✅ `Converted length` es > 0
- ✅ `normalizedUser.role.permissions` es un array con strings

---

### FRONTEND: Verificar en consola del navegador

#### 1. Después de Login

En la consola del navegador, ejecutar:

```javascript
// Obtener el usuario del contexto/estado
const user = /* obtener usuario del estado de autenticación */;

// Verificar permisos
console.log('user.role:', user.role);
console.log('user.role.permissions:', user.role?.permissions);
console.log('user.role.permissions.length:', user.role?.permissions?.length);

// Verificación final
if (user.role?.permissions && user.role.permissions.length > 0) {
  console.log('✅ OK: Permisos recibidos correctamente');
  console.log('Permisos:', user.role.permissions);
} else {
  console.error('❌ FAIL: Permisos vacíos o ausentes');
}
```

#### 2. Después de LoadMe

```javascript
// Después de llamar a GET /api/users/me o GET /api/auth/me
const response = await fetch('/api/users/me', {
  headers: { Authorization: `Bearer ${token}` }
});
const data = await response.json();
const user = data.user || data;

console.log('user.role.permissions:', user.role?.permissions);
console.log('user.role.permissions.length:', user.role?.permissions?.length);

if (user.role?.permissions && user.role.permissions.length > 0) {
  console.log('✅ OK: Permisos recibidos correctamente');
} else {
  console.error('❌ FAIL: Permisos vacíos o ausentes');
}
```

---

## ✅ CRITERIOS DE ÉXITO

### Backend (Logs)
- [ ] `[AUTH LOGIN] role.permissions before normalize` muestra objeto JSON válido
- [ ] `[NORMALIZE_USER] Converted length` es > 0
- [ ] `[AUTH LOGIN] normalizedUser.role.permissions` es array con elementos
- [ ] `[AUTH LOADME]` muestra logs similares
- [ ] `[AUTH REFRESH]` muestra logs similares

### Frontend (Consola)
- [ ] `user.role.permissions` existe y es un array
- [ ] `user.role.permissions.length > 0`
- [ ] Los permisos tienen formato `"module.action"` (ej: `"users.create"`)

---

## 📊 RESULTADO ESPERADO

### Payload correcto:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "fullName": "User Name",
  "role": {
    "id": "role-uuid",
    "name": "ADMINISTRATION",
    "permissions": [
      "users.create",
      "users.read",
      "users.update",
      "users.delete",
      "expenses.create",
      "expenses.read",
      "expenses.validate",
      ...
    ]
  }
}
```

### Logs de backend esperados:

```
[AUTH LOGIN] role.permissions before normalize: {
  "users": ["create", "read", "update", "delete"],
  "expenses": ["create", "read", "validate"],
  "suppliers": ["create", "read", "approve", "reject"],
  ...
}
[NORMALIZE_USER] Original permissions type: object, Converted length: 15
[AUTH LOGIN] normalizedUser.role.permissions: [
  "users.create",
  "users.read",
  "users.update",
  "users.delete",
  "expenses.create",
  "expenses.read",
  "expenses.validate",
  ...
]
```

---

## 🎯 OUTPUT FINAL

### Si TODO está correcto:

```
✅ OK
```

### Si hay problemas:

```
❌ FAIL

Backend:
- [Descripción del problema en logs]

Frontend:
- [Descripción del problema en consola]
```

---

## 🔧 TROUBLESHOOTING

### Problema: `role.permissions before normalize` es `null` o `undefined`

**Causa:** El role no se está cargando con la relación en la query.

**Solución:** Verificar que las queries usan `relations: ['role', 'organization']`.

### Problema: `Converted length: 0`

**Causa:** El objeto permissions está vacío o tiene estructura inesperada.

**Solución:** Verificar el formato en la base de datos:
```sql
SELECT id, name, permissions FROM roles WHERE id = 'role-uuid';
```

### Problema: Frontend recibe `permissions: []`

**Causa:** La conversión falló o el rol no tiene permisos definidos.

**Solución:** 
1. Verificar logs del backend
2. Verificar que el rol tiene permisos en la BD
3. Revisar la lógica de conversión en `normalizeUser`

---

**FIN DE AUDITORÍA**

