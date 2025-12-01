# Comandos Git y Pasos de Deployment

## 📋 Resumen de Cambios

### Archivos Modificados:
1. `src/auth/auth.module.ts` - Agregado UsersModule y ConfigModule a imports
2. `tsconfig.json` - Agregado `rootDir: "./src"`

### Archivos Nuevos:
1. `AUTH_MODULE_AUDIT_FIXES.md` - Documentación completa de la auditoría
2. `GIT_COMMANDS_AND_DEPLOY.md` - Este archivo

## 🔧 Comandos Git

### 1. Agregar archivos al staging
```bash
git add src/auth/auth.module.ts
git add tsconfig.json
git add AUTH_MODULE_AUDIT_FIXES.md
git add GIT_COMMANDS_AND_DEPLOY.md
```

O en un solo comando:
```bash
git add src/auth/auth.module.ts tsconfig.json AUTH_MODULE_AUDIT_FIXES.md GIT_COMMANDS_AND_DEPLOY.md
```

### 2. Verificar cambios antes del commit
```bash
git status
git diff --cached
```

### 3. Crear commit
```bash
git commit -m "fix(auth): Corregir montaje de AuthModule

- Agregar UsersModule a imports de AuthModule
- Agregar ConfigModule explícitamente a imports
- Agregar rootDir a tsconfig.json
- Resolver problema de 404 en /api/auth/login

Cambios:
- src/auth/auth.module.ts: Importar UsersModule y ConfigModule
- tsconfig.json: Agregar rootDir: './src'

Verificado:
- Build exitoso sin errores
- Sin errores de linting
- Módulo compilado correctamente en dist/"
```

### 4. Push al repositorio
```bash
git push origin main
```

O si estás en otra rama:
```bash
git push origin <nombre-rama>
```

## 🚀 Pasos para Redeploy en Render

### Opción 1: Desde el Dashboard de Render

1. **Acceder al Dashboard de Render**
   - Ir a: https://dashboard.render.com
   - Iniciar sesión en tu cuenta

2. **Seleccionar el Servicio**
   - Buscar y seleccionar el servicio: `pmd-backend-l47d`

3. **Limpiar Caché y Reconstruir**
   - Click en el menú "..." (tres puntos) en la parte superior derecha
   - Seleccionar **"Clear build cache"** o **"Clear cache & rebuild"**
   - Confirmar la acción

4. **Verificar el Deploy**
   - Esperar a que el build complete
   - Verificar los logs del deploy
   - Confirmar que no hay errores de compilación

5. **Probar el Endpoint**
   - Una vez desplegado, probar:
   ```bash
   curl -X POST https://pmd-backend-l47d.onrender.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

### Opción 2: Desde la CLI de Render (si está configurada)

```bash
# Si tienes Render CLI instalado
render services:deploy pmd-backend-l47d --clear-cache
```

## ✅ Checklist de Verificación Post-Deploy

- [ ] Build completado sin errores en Render
- [ ] Servicio iniciado correctamente
- [ ] Endpoint `/api/auth/login` responde (POST, no GET)
- [ ] Endpoint `/api/auth/register` responde (POST)
- [ ] Swagger disponible en `/api/docs`
- [ ] Logs no muestran errores de módulos

## 🔍 Comandos de Verificación Local (Opcional)

Antes de hacer push, puedes verificar localmente:

```bash
# 1. Build del proyecto
npm run build

# 2. Verificar que no hay errores de TypeScript
npx tsc --noEmit

# 3. Verificar estructura de dist
ls -la dist/auth/

# 4. Iniciar servidor local (opcional)
npm run start:dev
```

## 📝 Notas Importantes

1. **Rutas POST**: Recuerda que `/api/auth/login` y `/api/auth/register` son endpoints **POST**, no GET. Si intentas acceder con GET, obtendrás 404.

2. **Variables de Entorno**: Asegúrate de que en Render estén configuradas:
   - `JWT_SECRET`
   - `JWT_EXPIRATION` (opcional, default: '1d')
   - Variables de base de datos
   - `NODE_ENV=production`

3. **Tiempo de Deploy**: El deploy en Render puede tardar varios minutos, especialmente si se limpia el caché.

4. **Logs**: Si hay problemas, revisa los logs en Render Dashboard → Logs

## 🐛 Troubleshooting

### Si el endpoint sigue dando 404 después del deploy:

1. **Verificar logs de Render**:
   - Revisar si hay errores de compilación
   - Verificar si el servidor inició correctamente

2. **Verificar que el build incluye auth**:
   ```bash
   # En Render, revisar logs del build
   # Debería mostrar: "dist/auth/auth.module.js" compilado
   ```

3. **Verificar variables de entorno**:
   - Asegurarse de que todas las variables necesarias están configuradas

4. **Verificar que el código está actualizado**:
   - Confirmar que el commit fue pusheado correctamente
   - Verificar que Render está usando la rama correcta

5. **Reiniciar el servicio manualmente**:
   - En Render Dashboard → Manual Deploy → Deploy latest commit

