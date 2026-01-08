# Configuración de Migraciones Automáticas en Render

## ¿Cómo Funcionan las Migraciones en Render?

Con el auto-deploy configurado desde el repositorio Git, Render ejecuta automáticamente las migraciones cada vez que se hace un redeploy. Esto funciona de la siguiente manera:

### Flujo Automático en Render:

1. **Push al repositorio** → Render detecta el cambio
2. **Build Command ejecutado** → Compila el código y las migraciones
   ```
   npm install && npm run build
   ```
   - `npm run build` ejecuta `nest build && npm run build:migrations`
   - Las migraciones se compilan de `src/migrations/*.ts` a `dist/migrations/*.js`

3. **Start Command ejecutado** → Inicia la aplicación
   ```
   npm run start:prod
   ```
   - La aplicación inicia con `node dist/main.js`
   - TypeORM detecta que `migrationsRun: true` está configurado en producción
   - **TypeORM ejecuta automáticamente todas las migraciones pendientes** antes de iniciar el servidor
   - Solo ejecuta migraciones que aún no se han aplicado (según la tabla `migrations`)

### Configuración Requerida en Render:

#### Build Command:
```
npm install && npm run build
```

#### Start Command:
```
npm run start:prod
```

#### Variables de Entorno Necesarias:
- `DATABASE_URL`: URL de conexión a PostgreSQL (Render la proporciona automáticamente)
- `NODE_ENV`: Debe estar configurado como `production` (Render lo configura automáticamente)

### Migraciones que se Ejecutan Automáticamente:

Las siguientes migraciones se ejecutarán automáticamente en el orden correcto:

1. **1700000000038-SeedDefaultOrganization**: Crea la organización por defecto
2. **1700000000039-SeedRoles**: Crea los roles con sus permisos
3. **1700000000040-SeedTestUsers**: Crea los usuarios de prueba

**Nota**: Las migraciones anteriores (0000-0037) también se ejecutarán si no se han aplicado aún.

### Logs en Render:

Durante el deploy, verás en los logs de Render:

```
✅ Migraciones compiladas exitosamente
...
🔄 Executing pending migrations...
✅ Migration XXXXXXXXXXXXXX-SeedDefaultOrganization has been executed successfully
✅ Migration XXXXXXXXXXXXXX-SeedRoles has been executed successfully
✅ Migration XXXXXXXXXXXXXX-SeedTestUsers has been executed successfully
🚀 PMD Backend booting on port: 5000
```

### Ventajas de este Enfoque:

1. ✅ **Automático**: No requiere intervención manual
2. ✅ **Idempotente**: Solo ejecuta migraciones pendientes
3. ✅ **Seguro**: Las migraciones fallan si hay errores, evitando que la app inicie con la BD inconsistente
4. ✅ **Transaccional**: Cada migración se ejecuta en una transacción
5. ✅ **Versionado**: Todas las migraciones están en el repositorio Git

### Solución de Problemas:

#### Si las migraciones no se ejecutan:

1. Verifica que `NODE_ENV=production` esté configurado en Render
2. Verifica que las migraciones estén compiladas en `dist/migrations/*.js`
3. Revisa los logs de Render para ver si hay errores durante el build o start
4. Verifica que la base de datos esté accesible desde Render

#### Si necesitas ejecutar migraciones manualmente:

Si por alguna razón necesitas ejecutar migraciones manualmente en Render:

1. Ve a la consola de Render (Render Shell)
2. Ejecuta: `npm run migration:run`

#### Si necesitas revertir una migración:

⚠️ **Advertencia**: Revertir migraciones puede causar pérdida de datos.

En Render Shell, ejecuta:
```
npm run migration:revert
```

### Estado Actual de las Migraciones:

Puedes verificar qué migraciones se han ejecutado consultando la tabla `migrations` en la base de datos:

```sql
SELECT * FROM migrations ORDER BY timestamp DESC;
```

O usando el comando de TypeORM:
```
npm run migration:show
```
