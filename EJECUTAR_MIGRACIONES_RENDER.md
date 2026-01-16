# 🔄 Ejecutar Migraciones en Render

## ❌ Problema Actual

El backend se despliega correctamente, pero falla con el error:
```
QueryFailedError: relation "users" does not exist
```

Esto ocurre porque **las migraciones no se han ejecutado** en la base de datos de Render.

---

## ✅ Solución: Ejecutar Migraciones

### Opción 1: Usando Render Shell (Recomendado)

1. **Ir a Render Dashboard**
   - Ve a tu Web Service
   - Click en **"Shell"** (en el menú lateral o en la parte superior)

2. **Ejecutar migraciones**:
   ```bash
   npm run migration:run:prod
   ```

3. **Verificar que se ejecutaron**:
   Deberías ver algo como:
   ```
   🔄 Conectando a la base de datos...
   ✅ Conexión establecida
   🔄 Ejecutando migraciones...
   ✅ 42 migración(es) ejecutada(s):
      - EnableUuidExtension1700000000000
      - CreateEnums1700000000001
      ...
   ✅ Migraciones completadas
   ```

4. **Reiniciar el servicio**:
   - En Render Dashboard → Click en **"Manual Deploy"** → **"Deploy latest commit"**
   - O simplemente espera a que Render reinicie automáticamente

---

### Opción 2: Agregar al Build Command (Automático)

Si quieres que las migraciones se ejecuten automáticamente después de cada deploy:

1. **Ir a Render Dashboard** → **Settings**
2. **Modificar Build Command**:
   ```
   npm install && npm run build && npm run migration:run:prod
   ```

**⚠️ Nota**: Esto ejecutará las migraciones en cada deploy. Úsalo con cuidado.

---

### Opción 3: Usando Render CLI

Si tienes Render CLI instalado:

```bash
# Instalar Render CLI
curl -fsSL https://render.com/install.sh | bash

# Login
render login

# Ejecutar migraciones en el servicio
render shell <tu-service-id>
npm run migration:run:prod
```

---

## 🔍 Verificación

Después de ejecutar las migraciones:

1. **Verificar que las tablas existen**:
   - En Render Dashboard → PostgreSQL Service → **"Connect"** → **"psql"**
   - O usar cualquier cliente PostgreSQL
   - Ejecutar: `\dt` para listar tablas
   - Deberías ver: `users`, `roles`, `organizations`, etc.

2. **Verificar que el backend inicia correctamente**:
   - En Render Dashboard → **Logs**
   - Debe aparecer: `"Nest application successfully started"`
   - No debe haber errores de "relation does not exist"

---

## 🚨 Si las Migraciones Fallan

### Error: "Cannot connect to database"

**Verificar**:
1. `DATABASE_URL` está configurado en Environment Variables
2. La base de datos está activa (no dormida)
3. Las credenciales son correctas

### Error: "Migration already executed"

**Solución**: Esto es normal. Significa que las migraciones ya se ejecutaron. Puedes continuar.

### Error: "SSL required"

**Verificar**:
- `DATABASE_URL` incluye `?sslmode=require` o el script detecta SSL automáticamente
- En producción, Render siempre requiere SSL

---

## 📋 Checklist

- [ ] Build se completó exitosamente
- [ ] Migraciones compiladas en `dist/migrations/`
- [ ] `DATABASE_URL` configurado en Environment Variables
- [ ] Migraciones ejecutadas usando `npm run migration:run:prod`
- [ ] Backend reiniciado
- [ ] Logs muestran "Nest application successfully started"
- [ ] Health check funciona: `GET /api/health`

---

## 🎯 Próximos Pasos

Después de ejecutar las migraciones:

1. **Opcional: Ejecutar Seeds** (solo si necesitas datos de prueba):
   ```bash
   npm run seed
   ```
   ⚠️ **Nota**: Los seeds crean usuarios de prueba. En producción, considera crear usuarios manualmente.

2. **Verificar el sistema**:
   - Health check: `GET https://tu-backend.onrender.com/api/health`
   - Swagger: `https://tu-backend.onrender.com/api/docs`
   - Login: `POST https://tu-backend.onrender.com/api/auth/login`

---

## 📚 Scripts Disponibles

- `npm run migration:run:prod` - Ejecuta migraciones en producción (usa migraciones compiladas)
- `npm run migration:run` - Ejecuta migraciones en desarrollo (usa migraciones TypeScript)
- `npm run migration:show` - Muestra el estado de las migraciones
- `npm run seed` - Ejecuta seeds (datos de prueba)

---

**Fecha**: 16 de Enero, 2026  
**Estado**: ✅ Script creado y listo para usar
