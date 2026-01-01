# Corrección de Problemas de Testing - Memoria y Resolución de Módulos

**Fecha:** 2025-01-XX  
**Problema:** Errores al ejecutar `npm test` en el backend

---

## 🔴 Problemas Identificados

### 1. Error de Memoria (Out of Memory)
```
FATAL ERROR: JavaScript heap out of memory
```

**Causa:** Jest consume demasiada memoria al ejecutar todos los tests simultáneamente.

### 2. Error de Resolución de Módulos
```
Cannot find module './im-a-teapot.exception' from '../node_modules/@nestjs/common/exceptions/index.js'
Cannot find module 'slash'
```

**Causa:** Problemas de resolución de módulos durante la ejecución de Jest, posiblemente relacionado con:
- Caché corrupto de Jest
- Problemas con la configuración de ts-jest
- Limitaciones de memoria que interrumpen la resolución de módulos

---

## ✅ Soluciones Implementadas

### 1. Configuración de Jest Mejorada

**Archivo:** `package.json`

Se actualizó la configuración de Jest para:
- Limitar el número de workers concurrentes (`maxWorkers: 2`)
- Aumentar el timeout de tests (`testTimeout: 30000`)
- Simplificar los scripts de test para evitar problemas de compatibilidad en Windows

```json
{
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node",
    "maxWorkers": 2,
    "testTimeout": 30000
  }
}
```

### 2. Scripts de Test Simplificados

**Antes:**
```json
"test": "jest",
"test:watch": "jest --watch",
"test:cov": "jest --coverage"
```

**Después:**
```json
"test": "jest --maxWorkers=2",
"test:watch": "jest --watch --maxWorkers=2",
"test:cov": "jest --coverage --maxWorkers=2",
"test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/jest/bin/jest.js --runInBand",
"test:e2e": "jest --config ./test/jest-e2e.json --maxWorkers=2"
```

**Razón:** 
- Limitar workers reduce el uso de memoria
- Scripts simplificados evitan problemas de compatibilidad en Windows
- `--maxWorkers=2` asegura que no se ejecuten demasiados tests en paralelo

---

## 🔧 Pasos Adicionales Recomendados

Si los problemas persisten, ejecuta los siguientes pasos en orden:

### Paso 1: Limpiar Caché de Jest

```bash
# Windows (PowerShell)
cd pmd-backend
npx jest --clearCache

# O manualmente
Remove-Item -Recurse -Force node_modules/.cache
Remove-Item -Recurse -Force coverage
```

### Paso 2: Reinstalar Dependencias (si es necesario)

```bash
# Windows (PowerShell)
cd pmd-backend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Paso 3: Ejecutar Tests Individualmente

Si los problemas de memoria persisten, ejecuta tests en grupos más pequeños:

```bash
# Ejecutar un archivo específico
npm test -- contracts.service.spec.ts

# Ejecutar en modo secuencial (sin paralelización)
npm test -- --runInBand

# Ejecutar solo tests que no fallan
npm test -- --passWithNoTests
```

### Paso 4: Ejecutar Tests con Más Memoria (Alternativa)

Si necesitas ejecutar todos los tests y tienes suficiente RAM disponible, puedes crear un script adicional:

```json
"test:all": "node --max-old-space-size=8192 node_modules/jest/bin/jest.js --maxWorkers=1"
```

**Nota:** Esto requiere al menos 8GB de RAM disponible.

---

## 📊 Resultados Esperados

Después de aplicar estos cambios:

1. ✅ Los tests deberían ejecutarse sin errores de memoria
2. ✅ La resolución de módulos debería funcionar correctamente
3. ✅ Los tests se ejecutarán más lentamente pero de manera estable
4. ✅ No deberían aparecer errores de módulos faltantes

---

## ⚠️ Notas Importantes

1. **Rendimiento:** Limitar workers a 2 hará que los tests se ejecuten más lentamente, pero de manera más estable.

2. **Memoria:** Si sigues teniendo problemas de memoria, considera:
   - Ejecutar tests en suites más pequeñas
   - Usar `--runInBand` para ejecución completamente secuencial
   - Aumentar la memoria disponible del sistema

3. **CI/CD:** En entornos de CI/CD, considera usar `--maxWorkers=1` o `--runInBand` para máxima estabilidad.

4. **Desarrollo Local:** Para desarrollo rápido, puedes ejecutar tests individuales con watch mode:
   ```bash
   npm test -- --watch --testPathPattern=expenses.service.spec.ts
   ```

---

## 🔍 Diagnóstico

Si los problemas persisten después de aplicar estos cambios:

1. Verifica la versión de Node.js (recomendado: v20.x)
2. Verifica que todas las dependencias estén correctamente instaladas
3. Revisa los logs completos de Jest para identificar tests específicos que causan problemas
4. Considera dividir tests grandes en archivos más pequeños

---

**Última actualización:** 2025-01-XX

