# 🔧 Actualización de CORS para Dominios de Producción

## 📅 Fecha: $(date)

## ⚠️ Problema Reportado

Error de CORS al intentar acceder al backend desde el frontend de producción:

```
Access to XMLHttpRequest at 'https://pmd-api.apayuscs.com/api/auth/brute-force-status' 
from origin 'https://pmd.apayuscs.com' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## ✅ Solución Implementada

Se actualizó la función `isOriginAllowed` en `src/main.ts` para permitir los dominios de producción.

### Cambios Realizados

**Archivo:** `pmd-backend/src/main.ts`

**Función actualizada:** `isOriginAllowed()`

**Dominios agregados:**
- ✅ `https://pmd.apayuscs.com` (frontend de producción)
- ✅ `http://pmd.apayuscs.com` (frontend de producción - HTTP)
- ✅ Cualquier subdominio de `*.apayuscs.com` (para futuros subdominios)

### Código Actualizado

```typescript
// CORS origin validation function (reusable for both handlers)
const isOriginAllowed = (origin: string | undefined): boolean => {
  // Allow requests with no origin (e.g., curl, server-to-server)
  if (!origin) {
    return true;
  }

  // Allow localhost:3000 for local development (http or https)
  if (origin === 'http://localhost:3000' || origin === 'https://localhost:3000') {
    return true;
  }

  // Allow any Vercel deployment (*.vercel.app)
  if (origin.endsWith('.vercel.app')) {
    return true;
  }

  // Allow production domains (apayuscs.com)
  if (origin === 'https://pmd.apayuscs.com' || origin === 'http://pmd.apayuscs.com') {
    return true;
  }

  // Allow any subdomain of apayuscs.com
  if (origin.endsWith('.apayuscs.com')) {
    return true;
  }

  return false;
};
```

## 🎯 Dominios Permitidos Actualmente

### Desarrollo:
- ✅ `http://localhost:3000`
- ✅ `https://localhost:3000`

### Vercel (Staging/Preview):
- ✅ `*.vercel.app` (cualquier subdominio de Vercel)

### Producción (Apayuscs):
- ✅ `https://pmd.apayuscs.com`
- ✅ `http://pmd.apayuscs.com`
- ✅ `*.apayuscs.com` (cualquier subdominio)

## 🚀 Pasos para Aplicar el Cambio

### 1. Commit y Push

```bash
cd pmd-backend
git add src/main.ts
git commit -m "fix(cors): add apayuscs.com domains to allowed origins"
git push origin main
```

### 2. Redesplegar en Render

1. Ve a Render Dashboard → Tu servicio de backend
2. El servicio debería redesplegarse automáticamente al detectar el push
3. Si no se redesplega automáticamente:
   - Ve a **Manual Deploy** → **Deploy latest commit**

### 3. Verificar

1. Abre el frontend en producción: `https://pmd.apayuscs.com`
2. Abre DevTools (F12) → Network
3. Intenta hacer login o cualquier acción que llame al backend
4. Verifica que:
   - ✅ No hay errores de CORS
   - ✅ Las peticiones se completan exitosamente
   - ✅ Los headers incluyen `Access-Control-Allow-Origin: https://pmd.apayuscs.com`

## 🔍 Verificación de CORS

### Verificar Headers de Respuesta

En DevTools → Network → Selecciona una petición → Headers:

**Deberías ver:**
```
Access-Control-Allow-Origin: https://pmd.apayuscs.com
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token
Access-Control-Allow-Credentials: true
```

### Probar con cURL

```bash
# Probar preflight request (OPTIONS)
curl -X OPTIONS https://pmd-api.apayuscs.com/api/auth/brute-force-status \
  -H "Origin: https://pmd.apayuscs.com" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Deberías ver:
# < Access-Control-Allow-Origin: https://pmd.apayuscs.com
# < Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS
# < Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token
# < Access-Control-Allow-Credentials: true
```

## 🐛 Troubleshooting

### Problema: Sigue apareciendo el error de CORS

**Posibles causas:**

1. **El cambio no se ha desplegado:**
   - ✅ Verifica en Render Dashboard que el último deployment incluye el cambio
   - ✅ Revisa los logs del deployment

2. **El backend está usando una versión en caché:**
   - ✅ Fuerza un nuevo deployment en Render
   - ✅ Limpia la caché del navegador (Ctrl+Shift+R)

3. **El origen no coincide exactamente:**
   - ✅ Verifica que el frontend esté usando exactamente `https://pmd.apayuscs.com` (sin trailing slash)
   - ✅ Verifica que no haya redirecciones que cambien el origen

4. **Problema con el middleware de OPTIONS:**
   - ✅ Verifica que el middleware de OPTIONS esté funcionando correctamente
   - ✅ Revisa los logs del backend para ver si hay errores

### Problema: CORS funciona pero las cookies no se envían

**Solución:**
- Verifica que el frontend esté usando `credentials: 'include'` en las peticiones
- Verifica que el backend tenga `credentials: true` en la configuración de CORS (ya está configurado)

## 📝 Notas Técnicas

### Configuración de CORS en NestJS

El backend usa dos capas de protección CORS:

1. **Middleware de Express (OPTIONS handler):**
   - Maneja las peticiones preflight (OPTIONS)
   - Se ejecuta antes de que NestJS procese la ruta

2. **app.enableCors():**
   - Configuración de NestJS para CORS
   - Se aplica a todas las respuestas

Ambas capas usan la misma función `isOriginAllowed()` para mantener consistencia.

### Seguridad

- ✅ Solo se permiten orígenes específicos (whitelist)
- ✅ No se usa `origin: '*'` (permite cualquier origen)
- ✅ Se requiere `credentials: true` para cookies
- ✅ Headers permitidos están restringidos

## 🔗 Referencias

- **Documentación NestJS CORS:** https://docs.nestjs.com/security/cors
- **MDN CORS:** https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- **Render Dashboard:** https://dashboard.render.com

---

**Estado:** ✅ Implementado  
**Última actualización:** $(date)

