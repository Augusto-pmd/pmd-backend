# Guía de Bootstrap de Usuarios - PMD Backend

## Objetivo

Ejecutar manualmente el seed/bootstrap de usuarios en el backend PMD para crear los usuarios iniciales en la base de datos conectada a Render.

## Usuarios que se crearán

El script creará los siguientes usuarios con sus respectivos roles:

| Email | Rol | Contraseña por defecto |
|-------|-----|------------------------|
| admin@pmd.com | Administration | password123 |
| direction@pmd.com | Direction | password123 |
| supervisor@pmd.com | Supervisor | password123 |
| operator@pmd.com | Operator | password123 |

## Ejecución en Render

### Opción 1: Desde la consola/shell de Render (Recomendado)

1. **Acceder a la consola del servicio backend en Render:**
   - Ve a tu dashboard de Render
   - Selecciona el servicio backend PMD
   - Haz clic en "Shell" o "Console"

2. **Ejecutar el script de bootstrap:**
   ```bash
   npm run bootstrap
   ```
   
   O alternativamente:
   ```bash
   npm run seed
   ```
   
   O directamente con ts-node:
   ```bash
   npx ts-node scripts/bootstrap-users.ts
   ```

3. **Verificar la salida:**
   El script mostrará:
   - ✅ Conexión a la base de datos inicializada
   - ✅ Organización creada/verificada
   - ✅ Roles creados/verificados
   - ✅ Usuarios creados/actualizados
   - 📊 Resumen de operaciones

### Opción 2: Usando el endpoint de bootstrap (si está disponible)

Si el endpoint `/api/auth/bootstrap` está habilitado, puedes ejecutarlo:

```bash
curl -X POST https://tu-backend-en-render.com/api/auth/bootstrap
```

**Nota:** Este endpoint solo crea el usuario `admin@pmd.com`, no todos los usuarios.

## Configuración de contraseñas personalizadas

Puedes configurar contraseñas personalizadas usando variables de entorno antes de ejecutar el script:

```bash
export ADMIN_PASSWORD="tu_contraseña_admin"
export DIRECTION_PASSWORD="tu_contraseña_direction"
export SUPERVISOR_PASSWORD="tu_contraseña_supervisor"
export OPERATOR_PASSWORD="tu_contraseña_operator"

npm run bootstrap
```

O en Render, agrega estas variables de entorno en la configuración del servicio antes de ejecutar el script.

## Verificación

### 1. Verificar que los usuarios fueron creados

Después de ejecutar el script, prueba hacer login con uno de los usuarios:

```bash
curl -X POST https://tu-backend-en-render.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pmd.com","password":"password123"}'
```

### 2. Verificar en la base de datos (opcional)

Si tienes acceso a la base de datos PostgreSQL:

```sql
SELECT email, full_name, role_id, is_active 
FROM users 
WHERE email IN (
  'admin@pmd.com',
  'direction@pmd.com',
  'supervisor@pmd.com',
  'operator@pmd.com'
);
```

## Características del script

- **Idempotente:** Puede ejecutarse múltiples veces sin crear duplicados
- **Actualización automática:** Si un usuario existe pero le faltan datos (rol, organización, etc.), se actualiza automáticamente
- **Validación de contraseñas:** Si un usuario tiene una contraseña inválida (no es un hash bcrypt), se actualiza
- **Creación de roles:** Crea automáticamente los roles si no existen
- **Creación de organización:** Crea la organización por defecto si no existe

## Solución de problemas

### Error: "Cannot connect to database"

**Causa:** Las variables de entorno de la base de datos no están configuradas correctamente.

**Solución:** Verifica que `DATABASE_URL` esté configurada en Render con el formato:
```
postgresql://usuario:contraseña@host:puerto/nombre_base_datos?sslmode=require
```

### Error: "Relation does not exist"

**Causa:** Las migraciones no se han ejecutado.

**Solución:** Ejecuta las migraciones primero:
```bash
npm run migration:run
```

### Error: "Module not found" o errores de TypeScript

**Causa:** Las dependencias no están instaladas o el código no está compilado.

**Solución:** 
```bash
npm install
npm run build
```

Luego ejecuta el script nuevamente.

### Usuario no puede hacer login después del bootstrap

**Verificaciones:**
1. El usuario fue creado correctamente (revisa los logs del script)
2. La contraseña es correcta (por defecto: `password123`)
3. El usuario está activo (`is_active = true`)
4. El usuario tiene un rol asignado
5. El usuario tiene una organización asignada

## Comandos disponibles

- `npm run bootstrap` - Ejecuta el script de bootstrap de usuarios
- `npm run seed` - Alias para bootstrap
- `npm run bootstrap:users` - Alias para bootstrap
- `npm run reset-admin-password` - Solo resetea la contraseña del admin

## Resultado esperado

Después de ejecutar el script exitosamente:

✅ El endpoint `POST /api/auth/login` debe permitir login con:
- `admin@pmd.com` / `password123`
- `direction@pmd.com` / `password123`
- `supervisor@pmd.com` / `password123`
- `operator@pmd.com` / `password123`

❌ El error `USER_NOT_FOUND` debe desaparecer

## Notas importantes

- ⚠️ **Seguridad:** Cambia las contraseñas por defecto en producción
- ⚠️ **Idempotencia:** El script es seguro de ejecutar múltiples veces
- ⚠️ **Variables de entorno:** Asegúrate de que `DATABASE_URL` esté configurada correctamente en Render
