# 🚀 Ejecutar Bootstrap de Usuarios en Render

## Pasos rápidos

### 1. Acceder a la consola de Render

1. Ve a tu dashboard de Render: https://dashboard.render.com
2. Selecciona el servicio **backend PMD**
3. Haz clic en la pestaña **"Shell"** o **"Console"**

### 2. Ejecutar el script

En la consola de Render, ejecuta:

```bash
npm run bootstrap
```

### 3. Verificar la salida

Deberías ver algo como:

```
🚀 Iniciando bootstrap de usuarios...

✅ Conexión a la base de datos inicializada

📋 Verificando organización por defecto...
✅ Organización ya existe: PMD Arquitectura

👥 Verificando roles...
✅ Rol ya existe: direction
✅ Rol ya existe: supervisor
✅ Rol ya existe: administration
✅ Rol ya existe: operator

👤 Creando usuarios...

✅ Usuario creado: admin@pmd.com (administration)
✅ Usuario creado: direction@pmd.com (direction)
✅ Usuario creado: supervisor@pmd.com (supervisor)
✅ Usuario creado: operator@pmd.com (operator)

📊 Resumen:
   ✅ Creados: 4
   🔧 Actualizados: 0
   ⏭️  Ya existían: 0
   📝 Total procesados: 4

✅ Bootstrap de usuarios completado exitosamente!

📋 Usuarios disponibles para login:
   - admin@pmd.com (administration)
   - direction@pmd.com (direction)
   - supervisor@pmd.com (supervisor)
   - operator@pmd.com (operator)

✅ Conexión a la base de datos cerrada

🎉 Proceso finalizado correctamente
```

### 4. Probar el login

Prueba hacer login con uno de los usuarios creados:

```bash
curl -X POST https://tu-backend-en-render.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pmd.com","password":"password123"}'
```

## Comandos alternativos

Si `npm run bootstrap` no funciona, prueba:

```bash
# Opción 1
npm run seed

# Opción 2
npx ts-node scripts/bootstrap-users.ts

# Opción 3 (si ts-node no está disponible)
node -r ts-node/register scripts/bootstrap-users.ts
```

## Usuarios creados

| Email | Contraseña | Rol |
|-------|------------|-----|
| admin@pmd.com | password123 | Administration |
| direction@pmd.com | password123 | Direction |
| supervisor@pmd.com | password123 | Supervisor |
| operator@pmd.com | password123 | Operator |

## Solución de problemas

### Error: "Cannot find module 'ts-node'"

**Solución:**
```bash
npm install --save-dev ts-node
npm run bootstrap
```

### Error: "Cannot connect to database"

**Verifica:**
- Que la variable de entorno `DATABASE_URL` esté configurada en Render
- Que la base de datos esté accesible desde Render
- Que las migraciones se hayan ejecutado: `npm run migration:run`

### El script se ejecuta pero los usuarios no aparecen

**Verifica:**
- Revisa los logs del script para ver si hubo errores
- Verifica que las migraciones estén ejecutadas
- Intenta ejecutar el script nuevamente (es idempotente)

## ✅ Resultado esperado

Después de ejecutar el script:

- ✅ Los 4 usuarios están creados en la base de datos
- ✅ Puedes hacer login con `admin@pmd.com` / `password123`
- ✅ El error `USER_NOT_FOUND` desaparece
- ✅ Todos los usuarios tienen sus roles y organización asignados
