# 📖 GUÍA DE USUARIO - PMD Management System

**Versión:** 1.0  
**Última actualización:** 2025-01-01

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Roles y Permisos](#roles-y-permisos)
3. [Módulos Principales](#módulos-principales)
   - [Autenticación](#autenticación)
   - [Gestión de Obras](#gestión-de-obras)
   - [Gestión de Gastos](#gestión-de-gastos)
   - [Gestión de Cajas](#gestión-de-cajas)
   - [Gestión de Proveedores](#gestión-de-proveedores)
   - [Gestión de Contratos](#gestión-de-contratos)
   - [Contabilidad](#contabilidad)
   - [Sistema de Alertas](#sistema-de-alertas)
   - [Cronogramas (Gantt)](#cronogramas-gantt)
   - [Reportes](#reportes)
   - [Tipo de Cambio](#tipo-de-cambio)
   - [Backups](#backups)
4. [Flujos de Trabajo Principales](#flujos-de-trabajo-principales)
5. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## Introducción

El Sistema de Gestión PMD es una plataforma integral diseñada para la gestión de proyectos arquitectónicos y de construcción. Permite gestionar obras, gastos, proveedores, contratos, contabilidad y más, todo desde una interfaz centralizada.

---

## Roles y Permisos

El sistema cuenta con 4 roles principales:

### 🎯 Direction (Dirección)
- **Acceso:** Completo al sistema
- **Permisos especiales:**
  - Reabrir meses cerrados
  - Desbloquear contratos bloqueados
  - Gestionar usuarios y roles
  - Aprobar diferencias de caja
  - Sobrescribir cualquier restricción

### 👷 Supervisor
- **Acceso:** Visualización y supervisión
- **Puede:**
  - Ver todas las obras y su progreso
  - Ver todas las cajas
  - Marcar etapas del cronograma como completadas
  - Generar reportes
- **No puede:**
  - Crear o validar gastos
  - Modificar contabilidad
  - Aprobar proveedores
  - Cerrar cajas

### 💼 Administration (Administración)
- **Acceso:** Validación y aprobación
- **Puede:**
  - Validar gastos
  - Aprobar/rechazar proveedores
  - Gestionar contratos
  - Cerrar meses contables
  - Aprobar diferencias de caja
  - Generar reportes
- **No puede:**
  - Reabrir meses cerrados
  - Desbloquear contratos (solo Direction)
  - Gestionar usuarios/roles

### 🔧 Operator (Operador)
- **Acceso:** Limitado a recursos propios
- **Puede:**
  - Crear gastos propios
  - Crear proveedores provisionales
  - Gestionar su propia caja
  - Cerrar su propia caja
- **No puede:**
  - Validar gastos
  - Aprobar proveedores
  - Ver cajas de otros operadores
  - Acceder a contabilidad

---

## Módulos Principales

### Autenticación

#### Login
1. Accede a la página de login
2. Ingresa tu email y contraseña
3. El sistema te autenticará y redirigirá al dashboard

#### Usuario por defecto
- **Email:** `admin@pmd.com`
- **Password:** `1102Pequ`
- **Rol:** Direction (acceso completo)

⚠️ **IMPORTANTE:** Cambia esta contraseña en producción.

---

### Gestión de Obras

Las obras representan los proyectos arquitectónicos o de construcción que se están gestionando.

#### Crear una Obra
1. Navega a **Obras** → **Nueva Obra**
2. Completa los datos:
   - Nombre de la obra
   - Cliente
   - Dirección
   - Fecha de inicio
   - Moneda (ARS/USD)
   - Presupuesto total
   - Tipo de obra
3. Asigna un Supervisor
4. Guarda la obra

#### Ver Detalle de Obra
En el detalle de obra puedes ver:
- **Información general:** Datos de la obra, cliente, estado
- **Presupuesto:** Presupuesto total y por rúbrica
- **Gastos:** Lista de gastos asociados
- **Ingresos:** Lista de ingresos recibidos
- **Contratos:** Contratos relacionados
- **Cronograma:** Vista de Gantt del cronograma
- **Indicadores de Avance:**
  - **Avance Físico:** Basado en etapas completadas del cronograma
  - **Avance Económico:** Ingresos recibidos vs presupuesto total
  - **Avance Financiero:** Ingresos recibidos vs gastos ejecutados

#### Cerrar una Obra
Solo Direction puede cerrar una obra. Una vez cerrada, no se pueden agregar nuevos gastos o ingresos (excepto Direction con permisos especiales).

---

### Gestión de Gastos

#### Crear un Gasto
1. Navega a **Gastos** → **Nuevo Gasto**
2. Completa los datos:
   - Obra asociada
   - Proveedor
   - Contrato (opcional, pero recomendado)
   - Rúbrica
   - Monto
   - Fecha
   - Número de factura
   - Tipo de documento
3. Si el proveedor tiene condición fiscal configurada, los cálculos de IVA, percepciones y retenciones se calcularán automáticamente
4. Puedes editar los cálculos manualmente si es necesario
5. Guarda el gasto

#### Validar un Gasto
- Solo **Administration** y **Direction** pueden validar gastos
- Al validar un gasto:
  - Se crea automáticamente un registro contable
  - Se actualiza el saldo del contrato
  - Se actualiza el avance de la obra
  - Se crea un movimiento de caja si está asociado a una caja

#### Generación Automática de VAL
- Si el tipo de documento es "VAL" o no se proporciona número de documento, el sistema generará automáticamente un código VAL secuencial

---

### Gestión de Cajas

Las cajas permiten gestionar el dinero físico asignado a cada operador.

#### Abrir una Caja
1. Navega a **Cajas** → **Nueva Caja**
2. Ingresa el saldo inicial en ARS y/o USD
3. La caja se creará en estado "Abierta"

#### Refuerzo de Caja
1. Selecciona una caja abierta
2. Haz clic en **Refuerzo**
3. Ingresa el monto a agregar
4. El saldo se actualizará automáticamente

#### Cerrar una Caja
1. Selecciona una caja abierta
2. Haz clic en **Cerrar Caja**
3. Ingresa el saldo final en ARS y/o USD
4. El sistema calculará las diferencias automáticamente

#### Diferencias de Caja
Si hay diferencias al cerrar:
- El sistema generará una alerta automática
- **Administration** o **Direction** deben aprobar la diferencia
- Pueden:
  - **Aprobar:** Acepta la diferencia
  - **Rechazar:** Rechaza la diferencia (requiere explicación)
  - **Ajuste Manual:** Permite corregir manualmente el saldo

#### Historial de Caja
Cada caja tiene un historial detallado que muestra:
- Todos los movimientos
- Refuerzos realizados
- Gastos asociados
- Cierres de caja
- Aprobaciones/rechazos de diferencias

---

### Gestión de Proveedores

#### Crear Proveedor Provisional
**Operators** pueden crear proveedores en estado "Provisional":
1. Navega a **Proveedores** → **Nuevo Proveedor**
2. Completa los datos básicos (nombre, CUIT, email)
3. El proveedor quedará en estado "Provisional"

#### Aprobar Proveedor
Solo **Administration** y **Direction** pueden aprobar proveedores:
1. Selecciona un proveedor "Provisional"
2. Haz clic en **Aprobar**
3. El proveedor pasará a estado "Aprobado"

#### Documentos de Proveedor
Cada proveedor debe tener documentos asociados:
- **ART:** Seguro de riesgo de trabajo (obligatorio)
- **AFIP:** Constancia de inscripción AFIP
- Otros documentos según sea necesario

⚠️ **IMPORTANTE:** Si el ART vence:
- El proveedor se bloquea automáticamente
- Se genera una alerta crítica
- No se pueden crear gastos ni contratos con ese proveedor
- Se genera una alerta de advertencia 30 días antes del vencimiento

#### Tipo y Condición Fiscal
- **Tipo de Proveedor:** Selecciona el tipo (Compañía, Individual, etc.)
- **Condición Fiscal:** Determina los cálculos automáticos de impuestos:
  - **Responsable Inscripto (RI):** Cálculo completo de IVA, percepciones y retenciones
  - **Monotributista:** Sin IVA, con percepciones
  - **Exento:** Sin impuestos
  - **Otro:** Configuración personalizada

---

### Gestión de Contratos

#### Crear un Contrato
1. Navega a **Contratos** → **Nuevo Contrato**
2. Completa los datos:
   - Obra asociada
   - Proveedor (debe estar aprobado)
   - Rúbrica
   - Monto total
   - Moneda
   - Fecha de inicio y vencimiento (opcional)
   - Alcance y especificaciones (opcional)
3. El contrato se creará en estado "Activo"

#### Bloqueo Automático
- Cuando el `monto_ejecutado >= monto_total`, el contrato se bloquea automáticamente
- No se pueden crear nuevos gastos asociados al contrato bloqueado
- Solo **Direction** puede desbloquear un contrato bloqueado

#### Estados del Contrato
- **Activo:** Contrato en ejecución
- **Bloqueado:** Se alcanzó el monto total
- **Cerrado:** Contrato finalizado
- **Cancelado:** Contrato cancelado

---

### Contabilidad

#### Registros Contables
- Se crean automáticamente al validar un gasto
- Se pueden crear manualmente (solo Administration/Direction)
- Incluyen información de IVA, percepciones y retenciones

#### Cierre Mensual
Solo **Administration** puede cerrar un mes:
1. Navega a **Contabilidad** → **Cierre Mensual**
2. Selecciona el mes y año
3. Confirma el cierre

Una vez cerrado:
- No se pueden crear nuevos registros (excepto Direction)
- No se pueden modificar registros del mes (excepto Direction)

#### Reabrir Mes
Solo **Direction** puede reabrir un mes cerrado.

#### Reportes Contables

##### Libro de Compras (IVA)
1. Navega a **Contabilidad** → **Reportes** → **Libro de Compras**
2. Selecciona mes, año
3. Opcional: Filtra por obra o proveedor
4. Visualiza el reporte
5. Exporta a Excel o PDF

##### Percepciones
1. Navega a **Contabilidad** → **Reportes** → **Percepciones**
2. Selecciona mes, año
3. Opcional: Filtra por obra o proveedor
4. Visualiza el reporte con totales
5. Exporta a Excel o PDF

##### Retenciones
1. Navega a **Contabilidad** → **Reportes** → **Retenciones**
2. Selecciona mes, año
3. Opcional: Filtra por obra o proveedor
4. Visualiza el reporte con totales
5. Exporta a Excel o PDF

---

### Sistema de Alertas

El sistema genera alertas automáticamente para:
- **ART vencida:** Crítica cuando el ART de un proveedor vence
- **ART por vencer:** Advertencia 30 días antes del vencimiento
- **Diferencias de caja:** Cuando se cierra una caja con diferencias
- **Etapas vencidas:** Cuando una etapa del cronograma está vencida
- **Contratos bloqueados:** Cuando un contrato alcanza su monto total

#### Asignar Alerta
Solo **Administration** y **Direction** pueden asignar alertas:
1. Selecciona una alerta
2. Haz clic en **Asignar**
3. Selecciona el usuario responsable
4. La alerta cambiará a estado "En Revisión"

#### Resolver Alerta
El usuario asignado, Administration o Direction pueden resolver alertas:
1. Selecciona una alerta asignada
2. Haz clic en **Resolver**
3. Ingresa observaciones/notas de resolución
4. La alerta cambiará a estado "Resuelta"

#### Filtrar Alertas
Puedes filtrar alertas por:
- Estado (Abierta, En Revisión, Resuelta)
- Usuario asignado
- Severidad (Crítica, Advertencia, Info)
- Tipo de alerta
- Obra asociada
- Fecha

---

### Cronogramas (Gantt)

#### Generar Gantt Automático
1. Navega a una obra → **Cronograma**
2. Haz clic en **Generar Gantt**
3. El sistema creará automáticamente etapas predefinidas basadas en la duración estimada de la obra
4. Las duraciones se calcularán proporcionalmente

#### Regenerar Gantt
Si necesitas regenerar el cronograma:
1. Haz clic en **Regenerar Gantt**
2. Se eliminarán las etapas existentes y se crearán nuevas

#### Marcar Etapa como Completada
Solo **Supervisors** pueden marcar etapas como completadas:
1. Selecciona una etapa en el cronograma
2. Haz clic en **Marcar como Completada**
3. El avance físico de la obra se actualizará automáticamente

---

### Reportes

El sistema ofrece varios reportes:

#### Reportes Contables
- Libro de Compras (IVA)
- Percepciones
- Retenciones

Todos los reportes pueden:
- Filtrarse por mes, año, obra, proveedor
- Exportarse a Excel (XLSX)
- Exportarse a PDF
- Mostrar totales calculados

---

### Tipo de Cambio

#### Gestionar Tipos de Cambio
Solo **Administration** puede gestionar tipos de cambio:
1. Navega a **Tipo de Cambio**
2. Haz clic en **Nuevo Tipo de Cambio**
3. Ingresa:
   - Fecha
   - Tipo de cambio ARS/USD
4. Guarda

El sistema usa el tipo de cambio más reciente para conversiones automáticas.

---

### Backups

#### Crear Backup Manual
Solo **Administration** y **Direction** pueden crear backups:
1. Navega a **Backups**
2. Haz clic en **Crear Backup**
3. El sistema creará un backup completo de la base de datos
4. El backup se guardará localmente y, si está configurado, se subirá a almacenamiento en la nube

#### Backups Automáticos
El sistema ejecuta backups automáticamente:
- **Backup completo:** Diariamente a las 00:00
- **Backup incremental:** Cada 4 horas
- **Limpieza:** Semanalmente (elimina backups antiguos, mantiene 30 días)

#### Descargar Backup
1. Navega a **Backups**
2. Selecciona un backup
3. Haz clic en **Descargar**

---

## Flujos de Trabajo Principales

### Flujo: Gasto desde Creación hasta Contabilidad

1. **Operator** crea un gasto asociado a una obra y proveedor
2. El sistema valida:
   - Que el proveedor esté aprobado
   - Que el contrato no esté bloqueado
   - Que la obra esté activa
3. Si el proveedor tiene condición fiscal, se calculan automáticamente IVA, percepciones y retenciones
4. **Administration** valida el gasto
5. Al validar:
   - Se crea un registro contable
   - Se actualiza el monto ejecutado del contrato
   - Se actualiza el avance financiero de la obra
   - Se crea un movimiento de caja si está asociado

### Flujo: Proveedor Provisional a Aprobado

1. **Operator** crea un proveedor provisional
2. **Operator** sube documentos (ART, AFIP, etc.)
3. **Administration** revisa los documentos
4. **Administration** aprueba el proveedor
5. El proveedor queda disponible para crear contratos y gastos

### Flujo: Cierre de Caja con Diferencia

1. **Operator** cierra su caja ingresando el saldo final
2. El sistema calcula diferencias
3. Si hay diferencias:
   - Se genera una alerta automática
   - La caja queda pendiente de aprobación
4. **Administration** o **Direction** revisa la diferencia
5. Pueden:
   - Aprobar la diferencia
   - Rechazar (requiere explicación)
   - Hacer un ajuste manual

### Flujo: Cierre Mensual Contable

1. **Administration** cierra un mes contable
2. El mes queda bloqueado para nuevas operaciones
3. **Administration** genera reportes (Libro de Compras, Percepciones, Retenciones)
4. Los reportes se exportan a Excel/PDF
5. Si es necesario, **Direction** puede reabrir el mes

---

## Preguntas Frecuentes

### ¿Por qué no puedo crear un gasto?
Posibles razones:
- El proveedor no está aprobado (debe ser aprobado por Administration)
- El contrato está bloqueado (alcanzó su monto total)
- La obra está cerrada
- El ART del proveedor está vencido

### ¿Cómo desbloqueo un contrato?
Solo **Direction** puede desbloquear contratos. Navega al contrato y selecciona la opción "Desbloquear".

### ¿Puedo modificar un registro contable de un mes cerrado?
Solo **Direction** puede modificar registros de meses cerrados. Los demás usuarios no pueden.

### ¿Cómo actualizo el avance de una obra?
El avance se actualiza automáticamente cuando:
- Se validan gastos (avance financiero)
- Se registran ingresos (avance económico)
- Se completan etapas del cronograma (avance físico)

También puedes actualizar manualmente desde el detalle de obra (solo Direction).

### ¿Cómo exporto reportes?
En la página de reportes contables:
1. Genera el reporte con los filtros deseados
2. Haz clic en **Exportar a Excel** o **Exportar a PDF**
3. El archivo se descargará automáticamente

### ¿Los backups se crean automáticamente?
Sí, el sistema crea backups automáticamente:
- Backup completo diario a las 00:00
- Backup incremental cada 4 horas
- Los backups antiguos (más de 30 días) se eliminan automáticamente

También puedes crear backups manuales desde la sección de Backups.

---

**Última actualización:** 2025-01-01  
**Para más información técnica:** Ver [README.md](README.md) y [Swagger Documentation](http://localhost:5000/api/docs)

