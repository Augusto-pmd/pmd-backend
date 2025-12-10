# 🟦 FASE 2 — ARREGLAR TODOS LOS FETCH DEL FRONTEND

**Estado:** ⏳ PENDIENTE - Requiere acceso al código del frontend  
**Prioridad:** 🔴 CRÍTICA - Sin esto, el frontend no podrá comunicarse con el backend

---

## 📋 OBJETIVO

Reemplazar **TODAS** las rutas sin prefijo `/api` por rutas con prefijo `/api` en todo el código del frontend.

---

## 🔍 DÓNDE BUSCAR

Buscar en estos directorios/carpetas del frontend:

1. **Stores** (`store/*`, `stores/*`, `src/store/*`)
2. **Hooks de API** (`hooks/api/*`, `hooks/*`, `src/hooks/*`)
3. **Componentes** (`components/*`, `src/components/*`)
4. **Servicios** (`services/*`, `src/services/*`, `api/*`)
5. **Utils/Helpers** (`utils/*`, `helpers/*`, `src/utils/*`)

---

## 🔄 REEMPLAZOS REQUERIDOS

### Rutas de Autenticación
```typescript
// ❌ ANTES
fetch('/auth/login', ...)
fetch('/auth/refresh', ...)
fetch('/auth/register', ...)

// ✅ DESPUÉS
fetch('/api/auth/login', ...)
fetch('/api/auth/refresh', ...)
fetch('/api/auth/register', ...)
```

### Rutas de Usuarios
```typescript
// ❌ ANTES
fetch('/users', ...)
fetch('/users/:id', ...)
fetch('/staff', ...)  // Si existe, cambiar a /api/users

// ✅ DESPUÉS
fetch('/api/users', ...)
fetch('/api/users/:id', ...)
fetch('/api/users', ...)  // Si /staff existe, usar /api/users
```

### Rutas de Obras
```typescript
// ❌ ANTES
fetch('/works', ...)
fetch('/works/:id', ...)

// ✅ DESPUÉS
fetch('/api/works', ...)
fetch('/api/works/:id', ...)
```

### Rutas de Proveedores
```typescript
// ❌ ANTES
fetch('/suppliers', ...)
fetch('/suppliers/:id', ...)

// ✅ DESPUÉS
fetch('/api/suppliers', ...)
fetch('/api/suppliers/:id', ...)
```

### Rutas de Contratos
```typescript
// ❌ ANTES
fetch('/contracts', ...)
fetch('/contracts/:id', ...)

// ✅ DESPUÉS
fetch('/api/contracts', ...)
fetch('/api/contracts/:id', ...)
```

### Rutas de Gastos
```typescript
// ❌ ANTES
fetch('/expenses', ...)
fetch('/expenses/:id', ...)

// ✅ DESPUÉS
fetch('/api/expenses', ...)
fetch('/api/expenses/:id', ...)
```

### Rutas de Ingresos
```typescript
// ❌ ANTES
fetch('/incomes', ...)
fetch('/incomes/:id', ...)

// ✅ DESPUÉS
fetch('/api/incomes', ...)
fetch('/api/incomes/:id', ...)
```

### Rutas de Cajas
```typescript
// ❌ ANTES
fetch('/cashbox', ...)
fetch('/cashboxes', ...)
fetch('/cash-movements', ...)

// ✅ DESPUÉS
fetch('/api/cashboxes', ...)  // Usar plural
fetch('/api/cashboxes', ...)
fetch('/api/cash-movements', ...)
```

### Rutas de Contabilidad
```typescript
// ❌ ANTES
fetch('/accounting', ...)
fetch('/accounting/reports', ...)

// ✅ DESPUÉS
fetch('/api/accounting', ...)
fetch('/api/accounting/reports', ...)
```

### Rutas de Auditoría
```typescript
// ❌ ANTES
fetch('/audit', ...)
fetch('/audit/logs', ...)

// ✅ DESPUÉS
fetch('/api/audit', ...)
fetch('/api/audit/logs', ...)
```

### Rutas de Roles
```typescript
// ❌ ANTES
fetch('/roles', ...)
fetch('/roles/:id', ...)

// ✅ DESPUÉS
fetch('/api/roles', ...)
fetch('/api/roles/:id', ...)
```

### Rutas de Dashboard
```typescript
// ❌ ANTES
fetch('/dashboard', ...)
fetch('/dashboard/stats', ...)

// ✅ DESPUÉS
fetch('/api/dashboard', ...)
fetch('/api/dashboard/stats', ...)
```

### Rutas de Alertas
```typescript
// ❌ ANTES
fetch('/alerts', ...)
fetch('/alerts/:id', ...)

// ✅ DESPUÉS
fetch('/api/alerts', ...)
fetch('/api/alerts/:id', ...)
```

### Rutas de Documentos
```typescript
// ❌ ANTES
fetch('/documents', ...)
fetch('/work-documents', ...)
fetch('/supplier-documents', ...)

// ✅ DESPUÉS
fetch('/api/work-documents', ...)  // Específico
fetch('/api/work-documents', ...)
fetch('/api/supplier-documents', ...)
```

---

## 🔍 PATRONES A BUSCAR

### 1. Fetch directo
```typescript
// Buscar:
fetch('/auth/login'
fetch('/works'
fetch('/suppliers'
fetch('/users'
fetch('/roles'
fetch('/expenses'
fetch('/incomes'
fetch('/cashbox'
fetch('/accounting'
fetch('/audit'
fetch('/dashboard'
fetch('/alerts'
fetch('/documents'
fetch('/contracts'
fetch('/clients'  // Puede no existir
fetch('/staff'    // Puede ser /api/users
```

### 2. Axios
```typescript
// Buscar:
axios.get('/auth/login'
axios.post('/works'
axios.get('/suppliers'
axios.put('/users'
axios.delete('/roles'
```

### 3. API clients/configuraciones
```typescript
// Buscar en archivos como:
// - api.ts
// - apiClient.ts
// - httpClient.ts
// - apiConfig.ts
// - constants.ts

// Ejemplo:
const API_BASE_URL = '/';  // ❌ Cambiar a '/api'
const API_BASE_URL = '';   // ❌ Cambiar a '/api'
```

### 4. Variables de entorno
```typescript
// Buscar:
process.env.API_URL
import.meta.env.VITE_API_URL
REACT_APP_API_URL

// Verificar que no tengan prefijo /api duplicado
```

### 5. Rutas con organizationId
```typescript
// Buscar:
fetch(`/${organizationId}/works`
fetch(`/${orgId}/suppliers`
fetch(`/api/${organizationId}/works`  // Ya tiene /api, verificar

// ⚠️ IMPORTANTE: Ver FASE 3 para organizationId
```

---

## 📝 EJEMPLOS DE ARCHIVOS A MODIFICAR

### Ejemplo 1: Store de Autenticación
```typescript
// store/authStore.ts o similar
// ❌ ANTES
const response = await fetch('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});

// ✅ DESPUÉS
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
```

### Ejemplo 2: Hook de API
```typescript
// hooks/useWorks.ts o similar
// ❌ ANTES
const fetchWorks = async () => {
  const response = await fetch('/works');
  return response.json();
};

// ✅ DESPUÉS
const fetchWorks = async () => {
  const response = await fetch('/api/works');
  return response.json();
};
```

### Ejemplo 3: Servicio/API Client
```typescript
// services/api.ts o apiClient.ts
// ❌ ANTES
class ApiClient {
  private baseURL = '/';
  
  async get(endpoint: string) {
    return fetch(`${this.baseURL}${endpoint}`);
  }
}

// ✅ DESPUÉS
class ApiClient {
  private baseURL = '/api';  // Agregar /api
  
  async get(endpoint: string) {
    return fetch(`${this.baseURL}${endpoint}`);
  }
}
```

### Ejemplo 4: Constantes
```typescript
// constants/api.ts o config.ts
// ❌ ANTES
export const API_ENDPOINTS = {
  LOGIN: '/auth/login',
  WORKS: '/works',
  SUPPLIERS: '/suppliers',
  USERS: '/users',
};

// ✅ DESPUÉS
export const API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  WORKS: '/api/works',
  SUPPLIERS: '/api/suppliers',
  USERS: '/api/users',
};
```

---

## 🔧 HERRAMIENTAS PARA BUSCAR

### VS Code / Cursor
1. **Buscar y Reemplazar Global:**
   - `Ctrl+Shift+F` (Windows/Linux) o `Cmd+Shift+F` (Mac)
   - Buscar: `'/auth/login'`
   - Reemplazar: `'/api/auth/login'`
   - Usar regex: `(?<!['"])/(auth|works|suppliers|users|roles|expenses|incomes|cashbox|accounting|audit|dashboard|alerts|documents|contracts)`

### Comandos de Terminal
```bash
# Buscar todas las rutas sin /api
grep -r "fetch('/" src/
grep -r "axios.get('/" src/
grep -r "axios.post('/" src/

# Buscar rutas específicas
grep -r "'/auth/login'" src/
grep -r "'/works'" src/
grep -r "'/suppliers'" src/
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

Después de hacer los cambios, verificar:

- [ ] Todas las rutas de autenticación tienen `/api`
- [ ] Todas las rutas de usuarios tienen `/api`
- [ ] Todas las rutas de obras tienen `/api`
- [ ] Todas las rutas de proveedores tienen `/api`
- [ ] Todas las rutas de contratos tienen `/api`
- [ ] Todas las rutas de gastos tienen `/api`
- [ ] Todas las rutas de ingresos tienen `/api`
- [ ] Todas las rutas de cajas tienen `/api`
- [ ] Todas las rutas de contabilidad tienen `/api`
- [ ] Todas las rutas de auditoría tienen `/api`
- [ ] Todas las rutas de roles tienen `/api`
- [ ] Todas las rutas de dashboard tienen `/api`
- [ ] Todas las rutas de alertas tienen `/api`
- [ ] No hay rutas duplicadas como `/api/api/...`
- [ ] Variables de entorno no tienen `/api` duplicado

---

## 🚨 ERRORES COMUNES A EVITAR

### 1. Duplicar /api
```typescript
// ❌ MAL
fetch('/api/api/works')  // Duplicado

// ✅ BIEN
fetch('/api/works')
```

### 2. Olvidar rutas dinámicas
```typescript
// ❌ MAL
fetch(`/works/${id}`)  // Falta /api

// ✅ BIEN
fetch(`/api/works/${id}`)
```

### 3. Rutas con query params
```typescript
// ❌ MAL
fetch(`/works?page=1&limit=10`)  // Falta /api

// ✅ BIEN
fetch(`/api/works?page=1&limit=10`)
```

### 4. Rutas con organizationId (ver FASE 3)
```typescript
// ⚠️ Esto se arreglará en FASE 3
// Por ahora, asegurar que tenga /api
fetch(`/api/${organizationId}/works`)  // Temporal, FASE 3 lo arreglará
```

---

## 📊 RUTAS DEL BACKEND DISPONIBLES

### ✅ Rutas que SÍ existen:
- `/api/auth/login`
- `/api/auth/refresh`
- `/api/auth/register`
- `/api/users`
- `/api/roles`
- `/api/works`
- `/api/suppliers`
- `/api/contracts`
- `/api/expenses`
- `/api/incomes`
- `/api/cashboxes`
- `/api/cash-movements`
- `/api/alerts`
- `/api/accounting`
- `/api/audit`
- `/api/dashboard`
- `/api/health`
- `/api/docs` (Swagger)

### ⚠️ Rutas que NO existen (usar alternativas):
- `/api/staff` → Usar `/api/users`
- `/api/clients` → Usar `/api/suppliers` o `/api/works`
- `/api/documents` → Usar `/api/work-documents` o `/api/supplier-documents`
- `/api/cashbox` → Usar `/api/cashboxes` (plural)

---

## 🎯 PRIORIDAD DE CAMBIOS

### 🔴 CRÍTICO (Hacer primero):
1. `/auth/login` → `/api/auth/login`
2. `/auth/refresh` → `/api/auth/refresh`
3. `/works` → `/api/works`
4. `/suppliers` → `/api/suppliers`
5. `/users` → `/api/users`

### 🟡 IMPORTANTE (Hacer después):
6. `/expenses` → `/api/expenses`
7. `/incomes` → `/api/incomes`
8. `/cashboxes` → `/api/cashboxes`
9. `/accounting` → `/api/accounting`
10. `/audit` → `/api/audit`

### 🟢 NORMAL (Completar):
11. Todas las demás rutas

---

## 📝 NOTAS FINALES

1. **Probar cada cambio:** Después de cambiar cada ruta, probar que funciona
2. **No duplicar /api:** Verificar que no haya `/api/api/...`
3. **Variables de entorno:** Si hay `API_BASE_URL`, asegurar que sea `/api` o vacío (y agregar `/api` en cada fetch)
4. **Rutas dinámicas:** No olvidar rutas con parámetros como `/works/:id`
5. **Query params:** Mantener query params: `/api/works?page=1`

---

## 🔗 SIGUIENTE FASE

Después de completar FASE 2, continuar con:
- **FASE 3:** Arreglar `organizationId` en todos los stores
- **FASE 4:** Redeploy backend
- **FASE 5:** Prueba final

---

**Estado:** ⏳ Esperando acceso al código del frontend para aplicar cambios






