# Entrypoint Report - Backend NestJS

## Fecha: 1 de Diciembre, 2025

## Análisis Completo de dist/

### Estructura de dist/

```
dist/
├── main.d.ts (11 bytes)
├── main.js (3,388 bytes) ← ENTRYPOINT
└── main.js.map (2,303 bytes)
```

**Total de archivos**: 3 archivos
**Total de subdirectorios**: 0 (todos los archivos están en la raíz de dist/)

---

## Verificación de Archivos Main

### ✅ dist/main.js
- **Existe**: ✅ SÍ
- **Tamaño**: 3,388 bytes
- **Ubicación**: Raíz de `dist/`
- **Contiene bootstrap()**: ✅ SÍ
- **Llama bootstrap()**: ✅ SÍ (al final del archivo: `bootstrap();`)

### ❌ dist/src/main.js
- **Existe**: ❌ NO

### ❌ dist/apps/main.js
- **Existe**: ❌ NO

### ❌ dist/pmd-backend/main.js
- **Existe**: ❌ NO

---

## Entrypoint Identificado

### Archivo Exacto
```
dist/main.js
```

### Path Absoluto
```
C:\Users\augus\OneDrive\Escritorio\veamos cursor\dist\main.js
```

### Path Relativo (desde raíz del repo)
```
dist/main.js
```

### Comando de Ejecución
```bash
node dist/main.js
```

O usando npm script:
```bash
npm run start:prod
```

---

## Análisis del Contenido de dist/main.js

### Estructura del Archivo

1. **Imports**:
   - `@nestjs/core` - NestFactory
   - `@nestjs/common` - ValidationPipe
   - `@nestjs/swagger` - SwaggerModule, DocumentBuilder
   - `@nestjs/config` - ConfigService
   - `cors` - Middleware CORS
   - `./app.module` - AppModule

2. **Función bootstrap()**:
   - Crea la aplicación NestJS
   - Configura global prefix: `'api'`
   - Configura CORS
   - Configura ValidationPipe global
   - Configura Swagger documentation
   - Obtiene el puerto del ConfigService (default: 3000)
   - Inicia el servidor con `app.listen(port)`

3. **Llamada a bootstrap()**:
   - Al final del archivo: `bootstrap();`
   - Esto inicia la aplicación cuando se ejecuta el archivo

### Código Relevante

```javascript
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api');
    // ... configuración ...
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
```

---

## Configuración para Render

### Start Command
```
npm run start:prod
```

O directamente:
```
node dist/main.js
```

### Verificación

**¿Por qué `dist/main.js` es el entrypoint correcto?**

1. ✅ Es el único archivo que contiene la función `bootstrap()`
2. ✅ Es el único archivo que llama `bootstrap()` al final
3. ✅ Está en la raíz de `dist/`, no en subdirectorios
4. ✅ `tsconfig.build.json` tiene `outDir: "./dist"` y `rootDir: "./src"`
5. ✅ `src/main.ts` se compila directamente a `dist/main.js` (sin subdirectorios)
6. ✅ El script `start:prod` en `package.json` apunta a `node dist/main.js`

---

## Comparación con Otras Estructuras

### Estructura Monorepo (NO aplica)
Si fuera un monorepo, el entrypoint podría estar en:
- `dist/apps/backend/main.js` ❌ NO existe
- `dist/apps/api/main.js` ❌ NO existe

### Estructura con Namespace (NO aplica)
Si tuviera namespace del proyecto:
- `dist/pmd-backend/main.js` ❌ NO existe
- `dist/pmd-management-system/main.js` ❌ NO existe

### Estructura con src/ (NO aplica)
Si mantuviera la estructura de src/:
- `dist/src/main.js` ❌ NO existe

### Estructura Actual (CORRECTA)
- `dist/main.js` ✅ EXISTE y es el entrypoint correcto

---

## Archivos Relacionados

### main.d.ts
- **Tipo**: TypeScript declaration file
- **Tamaño**: 11 bytes
- **Propósito**: Definiciones de tipos para TypeScript
- **No es ejecutable**: Solo para desarrollo/IDE

### main.js.map
- **Tipo**: Source map
- **Tamaño**: 2,303 bytes
- **Propósito**: Mapeo entre código compilado y código fuente
- **No es ejecutable**: Solo para debugging

### main.js
- **Tipo**: JavaScript compilado
- **Tamaño**: 3,388 bytes
- **Propósito**: **ENTRYPOINT - Archivo ejecutable**
- **Ejecutable**: ✅ SÍ

---

## Verificación de Compilación

### Configuración de Build

**tsconfig.build.json**:
```json
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  }
}
```

**Resultado**:
- `src/main.ts` → `dist/main.js` ✅
- No se crean subdirectorios ✅
- Estructura plana en `dist/` ✅

---

## Comandos de Verificación

### Verificar que el archivo existe
```bash
# Windows
dir dist\main.js

# Linux/Mac
ls dist/main.js
```

### Verificar contenido
```bash
# Verificar que contiene bootstrap
grep "bootstrap" dist/main.js

# Verificar que llama bootstrap()
grep "bootstrap();" dist/main.js
```

### Ejecutar localmente
```bash
# Opción 1: Directo
node dist/main.js

# Opción 2: Usando npm script
npm run start:prod
```

---

## Resumen Final

### Entrypoint Exacto
```
dist/main.js
```

### Path Completo
```
C:\Users\augus\OneDrive\Escritorio\veamos cursor\dist\main.js
```

### Path Relativo
```
dist/main.js
```

### Comando de Ejecución
```bash
node dist/main.js
```

### Comando npm
```bash
npm run start:prod
```

### Configuración Render
```
Start Command: npm run start:prod
```

---

## Conclusión

✅ **El entrypoint correcto es `dist/main.js`**

- Es el único archivo ejecutable que inicia la aplicación
- Contiene la función `bootstrap()` y la llama al final
- Está en la raíz de `dist/`, no en subdirectorios
- Es el archivo que genera el build de NestJS
- Es el archivo al que apunta el script `start:prod`

**Render debe ejecutar**: `npm run start:prod` o `node dist/main.js`

---

**Generado automáticamente el**: 1 de Diciembre, 2025

