# Instrucciones para Ejecutar Seed en Render (Producción)

## Problema
El backend está funcionando en Render, pero la base de datos no tiene usuarios, por lo que no se puede hacer login.

## Solución: Ejecutar el Script de Seed

El script de seed crea los roles y usuarios iniciales necesarios para el sistema.

### Usuarios que se crearán:

| Email | Rol | Contraseña |
|-------|-----|------------|
| direction@pmd.com | Direction | password123 |
| supervisor@pmd.com | Supervisor | password123 |
| admin@pmd.com | Administration | password123 |
| operator@pmd.com | Operator | password123 |

## Método 1: Ejecutar desde Shell de Render (Recomendado)

1. **Acceder al Shell de Render:**
   - Ve a tu dashboard de Render
   - Selecciona el servicio del backend
   - Haz clic en "Shell" en el menú lateral
   - Se abrirá una terminal en el navegador

2. **Ejecutar el seed:**
   ```bash
   npm run seed
   ```

3. **Verificar que se ejecutó correctamente:**
   - Deberías ver mensajes como:
     - `✅ Rol creado: DIRECTION`
     - `✅ Usuario de prueba creado: direction@pmd.com`
     - `✅ Seed completado exitosamente!`

4. **Probar el login:**
   - Usa `direction@pmd.com` / `password123` para hacer login

## Método 2: Ejecutar desde Terminal Local (SSH)

Si tienes acceso SSH a Render:

```bash
# Conectarse al servidor de Render (si tienes acceso SSH)
ssh usuario@servidor-render

# Navegar al directorio del proyecto
cd /ruta/al/proyecto

# Ejecutar el seed
npm run seed
```

## Método 3: Usar Render CLI

Si tienes Render CLI instalado:

```bash
# Instalar Render CLI (si no lo tienes)
npm install -g render-cli

# Conectarse a tu cuenta
render login

# Ejecutar comando en el servicio
render service:exec <service-id> -- npm run seed
```

## Verificación Post-Seed

Después de ejecutar el seed, verifica que los usuarios se crearon:

1. **Desde el Shell de Render:**
   ```bash
   # Conectarse a la base de datos PostgreSQL (si tienes acceso)
   psql $DATABASE_URL
   
   # Verificar usuarios
   SELECT email, "fullName", "isActive" FROM users;
   
   # Verificar roles
   SELECT name, description FROM roles;
   ```

2. **Desde la aplicación:**
   - Intenta hacer login con `direction@pmd.com` / `password123`
   - Deberías poder acceder al sistema

## Notas Importantes

⚠️ **El script de seed es idempotente:**
- Puedes ejecutarlo múltiples veces sin crear duplicados
- Si un usuario ya existe, se actualizará su información
- Si un rol ya existe, se actualizarán sus permisos

⚠️ **Seguridad en Producción:**
- Los usuarios creados tienen contraseñas por defecto (`password123`)
- **IMPORTANTE:** Cambia las contraseñas después del primer login
- Considera crear usuarios adicionales con contraseñas seguras

⚠️ **Variables de Entorno:**
- Asegúrate de que las variables de entorno de Render estén configuradas correctamente:
  - `DB_HOST`
  - `DB_PORT`
  - `DB_USERNAME`
  - `DB_PASSWORD`
  - `DB_DATABASE`
  - O `DATABASE_URL` (si usas conexión por URL)

## Troubleshooting

### Error: "Cannot connect to database"
- Verifica que las variables de entorno de la base de datos estén correctas
- Verifica que la base de datos esté accesible desde Render
- Revisa los logs del servicio en Render

### Error: "Module not found"
- Asegúrate de que las dependencias estén instaladas:
  ```bash
  npm install
  ```

### Error: "Migrations pending"
- El seed ejecuta migraciones automáticamente
- Si hay errores, ejecuta las migraciones manualmente primero:
  ```bash
  npm run migration:run
  ```

## Comandos Útiles

```bash
# Ver estado de migraciones
npm run migration:show

# Ejecutar migraciones manualmente
npm run migration:run

# Ver logs del servicio en Render
# (Desde el dashboard de Render, sección "Logs")
```

## Contacto

Si tienes problemas ejecutando el seed, verifica:
1. Los logs del servicio en Render
2. Las variables de entorno configuradas
3. La conectividad a la base de datos
