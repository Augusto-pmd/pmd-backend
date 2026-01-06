# 🔧 Backup sin herramientas externas

## ✅ Solución Implementada

**¡Buenas noticias!** El sistema ahora puede hacer backups **sin necesidad de instalar herramientas externas**.

Si `pg_dump` no está disponible, el sistema automáticamente usa un método basado en TypeORM que funciona completamente desde Node.js, sin dependencias externas.

## Comportamiento Actual

- ✅ **Si `pg_dump` está disponible**: Se usa `pg_dump` (más rápido y eficiente)
- ✅ **Si `pg_dump` NO está disponible**: Se usa automáticamente el método TypeORM (sin herramientas externas)
- ✅ **Los backups programados NUNCA se saltan**: Siempre funcionan, usando el método disponible

## Nota sobre Rendimiento

- `pg_dump`: Más rápido para bases de datos grandes, formato binario comprimido
- TypeORM: Funciona perfectamente, genera SQL plano, puede ser un poco más lento en bases muy grandes

Ambos métodos son completamente funcionales y producen backups válidos.

## Soluciones

### Opción 1: Instalar PostgreSQL Client Tools (Recomendado)

#### Paso 1: Descargar PostgreSQL

1. Visita: https://www.postgresql.org/download/windows/
2. Descarga el instalador oficial de PostgreSQL
3. Ejecuta el instalador

#### Paso 2: Durante la instalación

1. **Selecciona componentes**: Asegúrate de que **"Command Line Tools"** esté marcado
2. **Ubicación de instalación**: Anota la ruta (generalmente `C:\Program Files\PostgreSQL\[versión]\bin`)
3. **Durante la instalación**: Marca la opción **"Add PostgreSQL bin directory to PATH"**

#### Paso 3: Verificar instalación

Abre PowerShell o CMD y ejecuta:

```powershell
pg_dump --version
```

Si muestra la versión, está correctamente instalado.

### Opción 2: Agregar pg_dump al PATH manualmente

Si ya tienes PostgreSQL instalado pero no está en el PATH:

#### Paso 1: Encontrar la ubicación de pg_dump

Busca en estas ubicaciones comunes:
- `C:\Program Files\PostgreSQL\17\bin\pg_dump.exe`
- `C:\Program Files\PostgreSQL\16\bin\pg_dump.exe`
- `C:\Program Files\PostgreSQL\15\bin\pg_dump.exe`
- `C:\Program Files\PostgreSQL\14\bin\pg_dump.exe`
- `C:\Program Files (x86)\PostgreSQL\[versión]\bin\pg_dump.exe`

#### Paso 2: Agregar al PATH

1. Presiona `Win + R`, escribe `sysdm.cpl` y presiona Enter
2. Ve a la pestaña **"Opciones avanzadas"**
3. Haz clic en **"Variables de entorno"**
4. En **"Variables del sistema"**, busca `Path` y haz clic en **"Editar"**
5. Haz clic en **"Nuevo"** y agrega la ruta al directorio `bin` de PostgreSQL
   - Ejemplo: `C:\Program Files\PostgreSQL\15\bin`
6. Haz clic en **"Aceptar"** en todas las ventanas
7. **Reinicia** tu terminal/IDE para que los cambios surtan efecto

#### Paso 3: Verificar

Abre una **nueva** ventana de PowerShell/CMD y ejecuta:

```powershell
pg_dump --version
```

### Opción 3: Usar solo las herramientas cliente (sin instalar el servidor)

Si solo necesitas `pg_dump` y no quieres instalar el servidor completo:

1. Descarga el instalador de PostgreSQL
2. Durante la instalación, selecciona **solo** los componentes:
   - Command Line Tools
   - pgAdmin (opcional)
3. **NO** instales el servidor PostgreSQL si no lo necesitas

### Opción 4: Usar variable de entorno PG_DUMP_PATH (Recomendado para casos específicos)

Si no puedes modificar el PATH del sistema o necesitas usar una instalación específica de PostgreSQL:

1. Crea o edita el archivo `.env` en la raíz del proyecto `pmd-backend`
2. Agrega la ruta completa a `pg_dump`:

```env
PG_DUMP_PATH=C:\Program Files\PostgreSQL\15\bin\pg_dump.exe
```

**Para Windows:**
```env
PG_DUMP_PATH=C:\Program Files\PostgreSQL\15\bin\pg_dump.exe
```

**Para Linux:**
```env
PG_DUMP_PATH=/usr/bin/pg_dump
```

**Para macOS:**
```env
PG_DUMP_PATH=/usr/local/bin/pg_dump
# O si usas Homebrew:
PG_DUMP_PATH=/opt/homebrew/bin/pg_dump
```

**Ventajas:**
- ✅ No requiere modificar el PATH del sistema
- ✅ Permite usar una instalación específica de PostgreSQL
- ✅ Útil en entornos de desarrollo o producción donde no puedes modificar el PATH
- ✅ El sistema detecta automáticamente esta variable al iniciar

**Nota**: Reinicia la aplicación después de configurar esta variable.

## Verificación después de la instalación

### Opción 1: Usar script de verificación (Recomendado)

Ejecuta el script de verificación incluido:

```bash
npm run check:pg-dump
```

Este script verificará:
- ✅ Si `PG_DUMP_PATH` está configurado
- ✅ Si `pg_dump` está en el PATH del sistema
- ✅ Si `pg_dump` está en rutas comunes de instalación
- ✅ Si `pg_dump` funciona correctamente

### Opción 2: Verificar manualmente

1. Abre PowerShell o CMD y ejecuta:
   ```powershell
   pg_dump --version
   ```
   Si muestra la versión, está correctamente instalado.

2. **Reinicia** tu aplicación NestJS

3. Verifica los logs al iniciar - deberías ver:
   ```
   ✅ pg_dump initialized successfully: [ruta]
   ```

4. O consulta el endpoint de diagnóstico:
   ```
   GET /api/backups/diagnostics
   ```
   (Requiere autenticación como Administration o Direction)

### Opción 3: Verificar desde la API

Si la aplicación está corriendo, puedes consultar el endpoint de diagnóstico:

```bash
# Con autenticación (reemplaza TOKEN con tu JWT token)
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/backups/diagnostics
```

Este endpoint te mostrará:
- Estado de `pg_dump` (disponible/no disponible)
- Ruta actual de `pg_dump`
- Todas las rutas verificadas y su estado
- Sugerencias específicas para tu plataforma

## Solución temporal: Deshabilitar backups programados

Si no puedes instalar PostgreSQL client tools ahora, puedes deshabilitar temporalmente los backups programados comentando los métodos `@Cron` en `backup.service.ts`:

```typescript
// @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
//   name: 'daily-full-backup',
//   timeZone: 'America/Argentina/Buenos_Aires',
// })
async scheduleDailyBackup(): Promise<void> {
  // ...
}

// @Cron('0 */4 * * *', {
//   name: 'incremental-backup',
//   timeZone: 'America/Argentina/Buenos_Aires',
// })
async scheduleIncrementalBackup(): Promise<void> {
  // ...
}
```

**⚠️ Advertencia**: Esto deshabilitará los backups automáticos. Asegúrate de hacer backups manuales regularmente.

## Mejoras implementadas

El código ha sido mejorado para:
- ✅ **Soporte para variable de entorno PG_DUMP_PATH**: Permite especificar la ruta exacta de pg_dump
- ✅ **Verificación real de pg_dump**: No solo verifica que el archivo exista, sino que realmente funciona ejecutando `--version`
- ✅ **Cache de verificación**: Almacena la ruta verificada para evitar verificaciones repetidas
- ✅ **Inicialización al arrancar**: Verifica pg_dump cuando el servicio se inicia
- ✅ **Soporte multiplataforma**: Detecta pg_dump en Windows, Linux y macOS
- ✅ **Búsqueda dinámica**: Busca en más versiones de PostgreSQL (12-17) y en múltiples ubicaciones
- ✅ **Mensajes de error mejorados**: Proporciona instrucciones claras sobre cómo resolver el problema
- ✅ **Búsqueda inteligente**: En Windows busca en Program Files y Program Files (x86), en macOS busca en Homebrew y rutas comunes, en Linux busca en /usr/bin y otras ubicaciones estándar

## Soporte adicional

Si después de seguir estos pasos el problema persiste:

1. Verifica que PostgreSQL esté instalado correctamente
2. Verifica que `pg_dump.exe` exista en la ruta especificada
3. Reinicia completamente tu computadora después de modificar el PATH
4. Verifica que estés usando la misma terminal/IDE donde modificaste el PATH

