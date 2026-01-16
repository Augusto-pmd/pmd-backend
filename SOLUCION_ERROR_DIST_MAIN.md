# 🔧 Solución: Error "Cannot find module '/opt/render/project/src/dist/main.js'"

## ❌ Problema

El build se completa exitosamente, pero al intentar iniciar la aplicación, Render no encuentra el archivo `dist/main.js`:

```
Error: Cannot find module '/opt/render/project/src/dist/main.js'
```

## 🔍 Causa

El problema está en la configuración de `tsconfig.build.json`. Cuando `rootDir` no está explícitamente definido como `"./src"`, TypeScript puede generar una estructura de directorios incorrecta o Render puede buscar el archivo en una ubicación incorrecta.

## ✅ Solución Aplicada

Se corrigió `tsconfig.build.json` para que tenga explícitamente:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

### Cambios Realizados:

1. **Agregado `"rootDir": "./src"`** - Asegura que TypeScript compile desde `src/` hacia `dist/`
2. **Agregado `"include": ["src/**/*"]`** - Especifica explícitamente qué archivos incluir

## 📋 Verificación

Después de este cambio, el build debería generar:

```
dist/
  └── main.js  ✅ (correcto)
```

En lugar de:

```
dist/
  └── src/
      └── main.js  ❌ (incorrecto)
```

## 🚀 Próximos Pasos

1. **Hacer commit y push**:
   ```bash
   git add tsconfig.build.json
   git commit -m "fix: corregir rootDir en tsconfig.build.json para Render"
   git push origin main
   ```

2. **Render detectará los cambios** y hará un nuevo deploy automáticamente

3. **Verificar logs** en Render:
   - El build debe completarse exitosamente
   - El start debe encontrar `dist/main.js`
   - Debe aparecer: `"Nest application successfully started"`

## 🔍 Verificación Local

Para verificar que funciona localmente antes de hacer push:

```bash
# Limpiar build anterior
rm -rf dist

# Compilar
npm run build

# Verificar que dist/main.js existe
ls dist/main.js

# Probar ejecución
npm run start:prod
```

Si `dist/main.js` existe y se ejecuta correctamente, el problema está resuelto.

## 📝 Configuración Correcta en Render

Asegúrate de que en Render Dashboard tengas:

- **Root Directory**: `.` (o vacío)
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:prod`

---

**Fecha**: 8 de Enero, 2026  
**Estado**: ✅ Solucionado
