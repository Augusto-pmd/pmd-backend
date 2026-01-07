# 🛡️ Protección Contra Fuerza Bruta

## 📋 Descripción

El sistema implementa protección contra ataques de fuerza bruta que bloquea temporalmente las IPs después de múltiples intentos de login fallidos.

---

## ⚙️ Configuración

### Parámetros Actuales

```typescript
maxAttempts: 5        // Máximo de intentos fallidos antes de bloquear
blockDuration: 15 min // Duración del bloqueo (15 minutos)
windowDuration: 1h   // Ventana de tiempo para contar intentos (1 hora)
```

### Ubicación

- **Servicio:** `src/auth/services/brute-force.service.ts`
- **Guard:** `src/auth/guards/brute-force.guard.ts`
- **Controller:** `src/auth/auth.controller.ts`

---

## 🔒 Cómo Funciona

### 1. **Conteo de Intentos**

- Cada intento de login fallido incrementa un contador para la IP
- El contador se resetea después de 1 hora sin intentos
- Después de **5 intentos fallidos**, la IP se bloquea

### 2. **Bloqueo**

- Cuando se alcanza el límite, la IP se bloquea por **15 minutos**
- Durante el bloqueo, todas las peticiones de login son rechazadas con error `429 Too Many Requests`
- El bloqueo se almacena en memoria (Map), por lo que:
  - ✅ Se pierde al reiniciar el servidor
  - ✅ Se limpia automáticamente después de 15 minutos

### 3. **Identificación de IP**

El sistema identifica la IP usando (en orden de prioridad):
1. Header `x-forwarded-for` (primera IP en la cadena)
2. Header `x-real-ip`
3. IP directa de la conexión (`req.ip`)

---

## 📡 Endpoints Disponibles

### 1. **Verificar Estado de Bloqueo**

```http
GET /api/auth/brute-force-status
```

**Respuesta:**
```json
{
  "isBlocked": true,
  "remainingTime": 550202,
  "remainingMinutes": 10,
  "attemptCount": 5,
  "remainingAttempts": 0,
  "maxAttempts": 5,
  "blockDuration": 900000,
  "retryAfter": "2026-01-07T15:39:02.156Z"
}
```

**Uso:**
- El frontend puede llamar este endpoint para mostrar el tiempo restante al usuario
- No requiere autenticación

---

### 2. **Resetear Bloqueo de IP Actual**

```http
POST /api/auth/brute-force-reset
```

**Descripción:**
- Resetea el bloqueo para la IP que hace la petición
- Útil para desbloquear tu propia IP si te bloqueaste accidentalmente

**Respuesta exitosa:**
```json
{
  "message": "Brute force block reset successfully",
  "ipAddress": "192.168.1.1"
}
```

**Respuesta si no está bloqueada:**
```json
{
  "message": "IP address is not currently blocked",
  "ipAddress": "192.168.1.1"
}
```

**⚠️ IMPORTANTE:** Este endpoint debería estar protegido en producción (requerir autenticación o token especial).

---

### 3. **Resetear Todos los Bloqueos (Admin)**

```http
POST /api/auth/brute-force-reset-all
```

**Descripción:**
- Resetea TODOS los bloqueos activos
- Útil para administradores que necesitan limpiar bloqueos masivos

**Respuesta:**
```json
{
  "message": "All brute force blocks reset successfully",
  "blocksReset": 3
}
```

**⚠️ IMPORTANTE:** Este endpoint debería estar protegido en producción (requerir autenticación de administrador).

---

### 4. **Listar Todas las IPs Bloqueadas (Admin)**

```http
GET /api/auth/brute-force-list
```

**Descripción:**
- Obtiene una lista de todas las IPs bloqueadas con su tiempo restante
- Útil para monitoreo y administración

**Respuesta:**
```json
{
  "blocked": [
    {
      "identifier": "192.168.1.1",
      "blockedUntil": "2026-01-07T15:39:02.156Z",
      "remainingTime": 550202,
      "remainingMinutes": 10
    },
    {
      "identifier": "10.0.0.1",
      "blockedUntil": "2026-01-07T15:35:00.000Z",
      "remainingTime": 300000,
      "remainingMinutes": 5
    }
  ],
  "count": 2
}
```

**⚠️ IMPORTANTE:** Este endpoint debería estar protegido en producción.

---

## 🚨 Solución de Problemas

### Problema: IP Bloqueada Después de Intentos Fallidos

**Síntoma:**
```json
{
  "statusCode": 429,
  "message": {
    "message": "Too many failed login attempts. Please try again later.",
    "code": "BRUTE_FORCE_BLOCKED",
    "remainingTime": 550202,
    "remainingMinutes": 10
  }
}
```

**Soluciones:**

#### Opción 1: Esperar (Recomendado)
- Espera **15 minutos** y el bloqueo se levantará automáticamente
- El sistema se desbloqueará automáticamente después del tiempo especificado

#### Opción 2: Resetear Bloqueo (Desarrollo/Admin)
```bash
# Resetear tu propia IP
curl -X POST https://pmd-api.apayuscs.com/api/auth/brute-force-reset

# Resetear todas las IPs (solo admin)
curl -X POST https://pmd-api.apayuscs.com/api/auth/brute-force-reset-all
```

#### Opción 3: Reiniciar el Servidor
- Si tienes acceso al servidor, reiniciarlo limpiará todos los bloqueos (están en memoria)
- ⚠️ Solo hazlo si es necesario, ya que afectará a todos los usuarios

---

### Problema: Bloqueo Persistente Después de 15 Minutos

**Causa:** El servidor puede no estar limpiando automáticamente los registros expirados.

**Solución:**
1. Verifica que el servidor esté corriendo la versión más reciente
2. Reinicia el servidor si es necesario
3. Usa el endpoint de reset manual

---

### Problema: Múltiples Usuarios Bloqueados desde la Misma IP

**Causa:** El sistema bloquea por IP, no por usuario. Si varios usuarios comparten la misma IP (NAT, proxy, etc.), todos se bloquean juntos.

**Solución:**
- Considera implementar bloqueo por email en lugar de solo por IP (mejora futura)
- Por ahora, usa el endpoint de reset para desbloquear la IP compartida

---

## 🔧 Configuración Avanzada

### Modificar Parámetros

Edita `src/auth/services/brute-force.service.ts`:

```typescript
// Cambiar máximo de intentos
private readonly maxAttempts = 10; // Default: 5

// Cambiar duración del bloqueo (en milisegundos)
private readonly blockDuration = 30 * 60 * 1000; // 30 minutos (Default: 15 min)

// Cambiar ventana de tiempo (en milisegundos)
private readonly windowDuration = 2 * 60 * 60 * 1000; // 2 horas (Default: 1 hora)
```

**⚠️ IMPORTANTE:** Después de cambiar estos valores, necesitas:
1. Recompilar el backend
2. Redesplegar en producción

---

## 🔐 Seguridad

### Recomendaciones para Producción

1. **Proteger Endpoints de Reset:**
   - Agregar autenticación JWT a los endpoints de reset
   - Requerir rol de administrador
   - O usar un token secreto especial

2. **Monitoreo:**
   - Revisar logs regularmente para detectar ataques
   - Configurar alertas para bloqueos masivos

3. **Persistencia (Mejora Futura):**
   - Considerar almacenar bloqueos en base de datos o Redis
   - Esto permitiría persistir bloqueos entre reinicios del servidor

---

## 📊 Ejemplo de Uso en Frontend

```typescript
// Verificar estado antes de intentar login
async function checkBruteForceStatus() {
  const response = await fetch('/api/auth/brute-force-status');
  const status = await response.json();
  
  if (status.isBlocked) {
    alert(`Demasiados intentos fallidos. Intenta de nuevo en ${status.remainingMinutes} minutos.`);
    return false;
  }
  
  return true;
}

// Mostrar mensaje al usuario
if (error.code === 'BRUTE_FORCE_BLOCKED') {
  const minutes = error.remainingMinutes;
  showError(`Demasiados intentos fallidos. Espera ${minutes} minutos antes de intentar de nuevo.`);
}
```

---

## 📝 Notas Técnicas

### Almacenamiento en Memoria

- Los bloqueos se almacenan en un `Map<string, AttemptRecord>` en memoria
- Se pierden al reiniciar el servidor
- Se limpian automáticamente cuando expiran

### Limpieza Automática

- El método `cleanup()` debería llamarse periódicamente (actualmente no está programado)
- Los bloqueos se verifican automáticamente en `isBlocked()` y se eliminan si expiraron

### Identificación de IP

- El sistema prioriza headers de proxy (`x-forwarded-for`, `x-real-ip`)
- Esto es importante cuando el backend está detrás de un proxy reverso (nginx, Cloudflare, etc.)

---

## 🔗 Referencias

- **Código del Servicio:** `src/auth/services/brute-force.service.ts`
- **Guard:** `src/auth/guards/brute-force.guard.ts`
- **Controller:** `src/auth/auth.controller.ts`

---

**Última actualización:** $(date)

