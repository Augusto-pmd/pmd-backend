# 🔄 Guía de Migraciones y Seed de Base de Datos

Esta guía explica cómo ejecutar las migraciones de TypeORM y el seed de datos en diferentes entornos.

## 📋 Índice

- [Ejecución Automática](#ejecución-automática)
- [Ejecución Manual con Docker Compose](#ejecución-manual-con-docker-compose)
- [Ejecución Manual desde Dokploy](#ejecución-manual-desde-dokploy)
- [Verificar Estado de Migraciones](#verificar-estado-de-migraciones)

---

## 🚀 Ejecución Automática

### Configuración por Defecto

Por defecto, las migraciones se ejecutan **automáticamente** al iniciar el contenedor de la API si la variable de entorno `RUN_MIGRATIONS=true` está configurada (valor por defecto).

El script `start.sh`:
1. Espera a que PostgreSQL esté disponible
2. Ejecuta las migraciones pendientes
3. Inicia la aplicación

### Desactivar Ejecución Automática

Si prefieres ejecutar las migraciones manualmente, configura:

```env
RUN_MIGRATIONS=false
```

---

## 🐳 Ejecución Manual con Docker Compose

### Opción 1: Ejecutar dentro del contenedor de la API (Recomendado)

Si la API ya está corriendo:

```bash
# Entrar al contenedor
docker-compose exec api sh

# Dentro del contenedor, ejecutar migraciones
npm run migration:run

# Ver estado
npm run migration:show

# Salir del contenedor
exit
```

### Opción 2: Ejecutar en un contenedor temporal

```bash
# Ejecutar migraciones en un contenedor temporal (sin iniciar la API)
docker-compose run --rm api npm run migration:run

# Ver estado de migraciones
docker-compose run --rm api npm run migration:show

# Revertir última migración
docker-compose run --rm api npm run migration:revert
```

---

## ☁️ Ejecución Manual desde Dokploy

### Método 1: Terminal/SSH de Dokploy

1. Accede al panel de Dokploy
2. Ve a tu aplicación
3. Abre la terminal/SSH del contenedor
4. Ejecuta:

```bash
npm run migration:run
```

### Método 2: Variable de Entorno RUN_MIGRATIONS

En Dokploy, configura la variable de entorno:

```
RUN_MIGRATIONS=false
```

Esto desactiva la ejecución automática. Luego puedes ejecutar las migraciones manualmente cuando lo necesites.

### Método 3: Comando de Inicio Personalizado

Si necesitas más control, puedes configurar un comando de inicio personalizado en Dokploy:

```bash
sh -c "npm run migration:run && node dist/main.js"
```

---

## 📊 Verificar Estado de Migraciones

### Ver migraciones pendientes

```bash
# Con docker-compose
docker-compose run --rm migrations npm run migration:show

# Dentro del contenedor
docker-compose exec api npm run migration:show
```

### Ver migraciones ejecutadas

Las migraciones ejecutadas se registran en la tabla `migrations` de PostgreSQL:

```sql
SELECT * FROM migrations ORDER BY timestamp DESC;
```

---

## 🔧 Solución de Problemas

### Error: "Cannot find module 'src/data-source'"

**Causa:** El código fuente no está disponible en producción.

**Solución:** El Dockerfile ya incluye el código fuente necesario. Asegúrate de reconstruir la imagen:

```bash
docker-compose build --no-cache api
```

### Error: "Connection refused" o "ECONNREFUSED"

**Causa:** PostgreSQL no está disponible aún.

**Solución:** El script `start.sh` espera automáticamente. Si el problema persiste, verifica:

1. Que PostgreSQL esté corriendo: `docker-compose ps postgres`
2. Que la variable `DATABASE_URL` esté correctamente configurada
3. Que el servicio `api` tenga `depends_on: postgres` con `condition: service_healthy`

### Migraciones no se ejecutan automáticamente

**Verificar:**

1. Que `RUN_MIGRATIONS=true` esté configurado (o no esté configurado, ya que `true` es el default)
2. Revisar los logs del contenedor: `docker-compose logs api`
3. Verificar que el script `start.sh` tenga permisos de ejecución

---

## 📝 Comandos Útiles

### Generar nueva migración

```bash
# Localmente (desarrollo)
npm run migration:generate -- -n NombreDeLaMigracion

# Dentro del contenedor
docker-compose exec api npm run migration:generate -- -n NombreDeLaMigracion
```

### Revertir última migración

```bash
docker-compose run --rm migrations npm run migration:revert
```

### Ver todas las migraciones

```bash
docker-compose run --rm migrations npm run migration:show
```

---

## 🌱 Ejecución Automática del Seed

### Configuración por Defecto

El seed **NO** se ejecuta automáticamente por defecto en producción (`RUN_SEED=false`). Esto es por seguridad, ya que el seed crea usuarios por defecto con contraseñas conocidas.

### Activar Seed Automático

Para ejecutar el seed automáticamente al iniciar (útil en el primer despliegue):

```env
RUN_SEED=true
```

**⚠️ IMPORTANTE:**
- Solo activa esto en el **primer despliegue** o cuando necesites resetear datos
- El seed crea usuarios con contraseña `password123` (cámbialas después)
- En producción, considera ejecutar el seed manualmente después de modificar el script

### Orden de Ejecución

El script `start.sh` ejecuta en este orden:
1. Espera a que PostgreSQL esté disponible
2. Ejecuta migraciones (si `RUN_MIGRATIONS=true`)
3. Ejecuta seed (si `RUN_SEED=true`)
4. Inicia la aplicación

## ⚙️ Configuración en Producción

### Variables de Entorno Necesarias

```env
# Obligatorias
DATABASE_URL=postgresql://usuario:contraseña@host:puerto/bd?sslmode=require
NODE_ENV=production

# Opcional (default: true)
RUN_MIGRATIONS=true  # Ejecutar migraciones al iniciar

# Opcional (default: false)
RUN_SEED=false  # Ejecutar seed al iniciar (solo en primer despliegue)
```

### Flujo Recomendado en Producción

1. **Primera vez / Despliegue inicial:**
   - Configura `RUN_MIGRATIONS=true` (o déjalo sin configurar)
   - Configura `RUN_SEED=true` para el primer despliegue
   - Las migraciones y el seed se ejecutarán automáticamente al iniciar
   - **IMPORTANTE:** Cambia las contraseñas de los usuarios por defecto después

2. **Actualizaciones posteriores:**
   - Opción A: Dejar `RUN_MIGRATIONS=true` (migraciones automáticas)
   - Opción B: Configurar `RUN_MIGRATIONS=false` y ejecutar manualmente cuando sea necesario
   - **NO** dejes `RUN_SEED=true` en despliegues posteriores

3. **Migraciones críticas:**
   - Para migraciones que requieren atención especial, ejecuta manualmente
   - Usa `migration:show` para verificar el estado antes y después

---

## 🔒 Seguridad

- ✅ Las migraciones se ejecutan con las mismas credenciales de la aplicación
- ✅ Las migraciones no se ejecutan si la conexión a la BD falla
- ✅ El script espera a que PostgreSQL esté listo antes de ejecutar
- ⚠️ **Importante:** Revisa siempre las migraciones antes de ejecutarlas en producción

---

## 📚 Referencias

- [TypeORM Migrations Documentation](https://typeorm.io/migrations)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Dokploy Documentation](https://dokploy.com/docs)

