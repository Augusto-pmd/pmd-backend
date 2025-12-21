# 🔍 AUDITORÍA: DTOs de Creación - Errores 400

**Fecha:** 2025-01-XX  
**Objetivo:** Identificar por qué el backend responde 400 al crear recursos

---

## ⚙️ CONFIGURACIÓN DE VALIDACIÓN (CRÍTICA)

**Ubicación:** `src/main.ts` (líneas 74-79)

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // ✅ Solo permite propiedades con decoradores
    forbidNonWhitelisted: true,   // ⚠️ RECHAZA propiedades extra (causa 400)
    transform: true,              // ✅ Transforma tipos automáticamente
  }),
);
```

### ⚠️ IMPACTO DE `forbidNonWhitelisted: true`

**Si el frontend envía propiedades NO definidas en el DTO → 400 Bad Request**

**Ejemplo:**
```json
// Frontend envía:
{
  "name": "Proveedor Test",
  "cuit": "12345678",
  "extraField": "valor"  // ❌ Esta propiedad causa 400
}

// Backend rechaza porque "extraField" no está en CreateSupplierDto
```

---

## 📋 1. SUPPLIERS - CreateSupplierDto

### Ubicación
`src/suppliers/dto/create-supplier.dto.ts`

### Campos Requeridos (OBLIGATORIOS)

| Campo | Tipo | Validaciones | Descripción |
|-------|------|--------------|-------------|
| `name` | `string` | `@IsString()`, `@MaxLength(255)` | **REQUERIDO** - Nombre del proveedor |

### Campos Opcionales

| Campo | Tipo | Validaciones | Descripción |
|-------|------|--------------|-------------|
| `cuit` | `string?` | `@IsString()`, `@IsOptional()`, `@MaxLength(50)` | CUIT opcional |
| `email` | `string?` | `@IsEmail()`, `@IsOptional()`, `@MaxLength(255)` | Email opcional |
| `phone` | `string?` | `@IsString()`, `@IsOptional()`, `@MaxLength(50)` | Teléfono opcional |
| `category` | `string?` | `@IsString()`, `@IsOptional()`, `@MaxLength(255)` | Categoría opcional |
| `status` | `SupplierStatus?` | `@IsEnum(SupplierStatus)`, `@IsOptional()` | Estado del proveedor |
| `address` | `string?` | `@IsString()`, `@IsOptional()` | Dirección opcional |
| `created_by_id` | `string?` | `@IsUUID()`, `@IsOptional()` | UUID del creador |

### Enum: SupplierStatus

```typescript
enum SupplierStatus {
  PROVISIONAL = 'provisional',
  APPROVED = 'approved',
  BLOCKED = 'blocked',
  REJECTED = 'rejected',
}
```

### ✅ Payload Válido Mínimo

```json
{
  "name": "Proveedor Test"
}
```

### ✅ Payload Válido Completo

```json
{
  "name": "Proveedor Test",
  "cuit": "20123456789",
  "email": "proveedor@example.com",
  "phone": "+54 11 1234-5678",
  "category": "Construcción",
  "status": "provisional",
  "address": "Av. Corrientes 1234",
  "created_by_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

### ⚠️ Posibles Causas de 400

1. **Falta `name`** → 400 (campo requerido)
2. **Propiedad extra** → 400 (`forbidNonWhitelisted: true`)
3. **`name` > 255 caracteres** → 400 (`@MaxLength(255)`)
4. **`email` inválido** → 400 (`@IsEmail()`)
5. **`status` no es enum válido** → 400 (`@IsEnum(SupplierStatus)`)
6. **`created_by_id` no es UUID válido** → 400 (`@IsUUID()`)
7. **`cuit` > 50 caracteres** → 400 (`@MaxLength(50)`)

---

## 📋 2. WORKS - CreateWorkDto

### Ubicación
`src/works/dto/create-work.dto.ts`

### Campos Requeridos (OBLIGATORIOS)

| Campo | Tipo | Validaciones | Descripción |
|-------|------|--------------|-------------|
| `name` | `string` | `@IsString()`, `@MaxLength(255)` | **REQUERIDO** - Nombre de la obra |
| `client` | `string` | `@IsString()`, `@MaxLength(255)` | **REQUERIDO** - Cliente |
| `address` | `string` | `@IsString()` | **REQUERIDO** - Dirección |
| `start_date` | `string` | `@IsDateString()` | **REQUERIDO** - Fecha de inicio (ISO 8601) |
| `currency` | `Currency` | `@IsEnum(Currency)` | **REQUERIDO** - Moneda |

### Campos Opcionales

| Campo | Tipo | Validaciones | Descripción |
|-------|------|--------------|-------------|
| `end_date` | `string?` | `@IsDateString()`, `@IsOptional()` | Fecha de fin (ISO 8601) |
| `status` | `WorkStatus?` | `@IsEnum(WorkStatus)`, `@IsOptional()` | Estado de la obra |
| `supervisor_id` | `string?` | `@IsUUID()`, `@IsOptional()` | UUID del supervisor |
| `total_budget` | `number?` | `@IsNumber()`, `@IsOptional()`, `@Min(0)` | Presupuesto total |

### Enum: Currency

```typescript
enum Currency {
  ARS = 'ARS',
  USD = 'USD',
}
```

### Enum: WorkStatus

```typescript
enum WorkStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  FINISHED = 'finished',
  ADMINISTRATIVELY_CLOSED = 'administratively_closed',
  ARCHIVED = 'archived',
}
```

### ✅ Payload Válido Mínimo

```json
{
  "name": "Obra Test",
  "client": "Cliente XYZ",
  "address": "Av. Libertador 1234",
  "start_date": "2024-01-15",
  "currency": "ARS"
}
```

### ✅ Payload Válido Completo

```json
{
  "name": "Obra Test",
  "client": "Cliente XYZ",
  "address": "Av. Libertador 1234",
  "start_date": "2024-01-15",
  "end_date": "2024-12-31",
  "status": "active",
  "currency": "ARS",
  "supervisor_id": "123e4567-e89b-12d3-a456-426614174000",
  "total_budget": 1000000
}
```

### ⚠️ Posibles Causas de 400

1. **Falta `name`, `client`, `address`, `start_date` o `currency`** → 400 (campos requeridos)
2. **`start_date` o `end_date` formato inválido** → 400 (`@IsDateString()` espera ISO 8601: "YYYY-MM-DD")
3. **`currency` no es "ARS" o "USD"** → 400 (`@IsEnum(Currency)`)
4. **`status` no es enum válido** → 400 (`@IsEnum(WorkStatus)`)
5. **`supervisor_id` no es UUID válido** → 400 (`@IsUUID()`)
6. **`total_budget` < 0** → 400 (`@Min(0)`)
7. **`total_budget` no es número** → 400 (`@IsNumber()`)
8. **`name` o `client` > 255 caracteres** → 400 (`@MaxLength(255)`)
9. **Propiedad extra** → 400 (`forbidNonWhitelisted: true`)

### ⚠️ Formato de Fechas (CRÍTICO)

**Formato esperado:** ISO 8601 string (`YYYY-MM-DD`)

**✅ Válidos:**
- `"2024-01-15"`
- `"2024-12-31"`

**❌ Inválidos (causan 400):**
- `"2024/01/15"` (formato con slash)
- `"15-01-2024"` (formato DD-MM-YYYY)
- `new Date()` (objeto Date)
- `1642204800000` (timestamp)

---

## 📋 3. CASHBOXES - CreateCashboxDto

### Ubicación
`src/cashboxes/dto/create-cashbox.dto.ts`

### Campos Requeridos (OBLIGATORIOS)

| Campo | Tipo | Validaciones | Descripción |
|-------|------|--------------|-------------|
| `user_id` | `string` | `@IsUUID()` | **REQUERIDO** - UUID del usuario |
| `opening_date` | `string` | `@IsDateString()` | **REQUERIDO** - Fecha de apertura (ISO 8601) |

### Campos Opcionales

| Campo | Tipo | Validaciones | Descripción |
|-------|------|--------------|-------------|
| `status` | `CashboxStatus?` | `@IsEnum(CashboxStatus)`, `@IsOptional()` | Estado de la caja |
| `opening_balance_ars` | `number?` | `@IsNumber()`, `@IsOptional()`, `@Min(0)` | Balance inicial ARS |
| `opening_balance_usd` | `number?` | `@IsNumber()`, `@IsOptional()`, `@Min(0)` | Balance inicial USD |

### Enum: CashboxStatus

```typescript
enum CashboxStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}
```

### ✅ Payload Válido Mínimo

```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "opening_date": "2024-01-15"
}
```

### ✅ Payload Válido Completo

```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "opening_date": "2024-01-15",
  "status": "open",
  "opening_balance_ars": 50000,
  "opening_balance_usd": 100
}
```

### ⚠️ Posibles Causas de 400

1. **Falta `user_id` o `opening_date`** → 400 (campos requeridos)
2. **`user_id` no es UUID válido** → 400 (`@IsUUID()`)
3. **`opening_date` formato inválido** → 400 (`@IsDateString()`)
4. **`status` no es "open" o "closed"** → 400 (`@IsEnum(CashboxStatus)`)
5. **`opening_balance_ars` o `opening_balance_usd` < 0** → 400 (`@Min(0)`)
6. **Propiedad extra** → 400 (`forbidNonWhitelisted: true`)

---

## 📋 4. EXPENSES - CreateExpenseDto

### Ubicación
`src/expenses/dto/create-expense.dto.ts`

### Campos Requeridos (OBLIGATORIOS)

| Campo | Tipo | Validaciones | Descripción |
|-------|------|--------------|-------------|
| `work_id` | `string` | `@IsUUID()` | **REQUERIDO** - UUID de la obra |
| `rubric_id` | `string` | `@IsUUID()` | **REQUERIDO** - UUID de la rúbrica |
| `amount` | `number` | `@IsNumber()`, `@Min(0)` | **REQUERIDO** - Monto |
| `currency` | `Currency` | `@IsEnum(Currency)` | **REQUERIDO** - Moneda |
| `purchase_date` | `string` | `@IsDateString()` | **REQUERIDO** - Fecha de compra |
| `document_type` | `DocumentType` | `@IsEnum(DocumentType)` | **REQUERIDO** - Tipo de documento |

### Campos Opcionales

| Campo | Tipo | Validaciones |
|-------|------|--------------|
| `supplier_id` | `string?` | `@IsUUID()`, `@IsOptional()` |
| `document_number` | `string?` | `@IsString()`, `@IsOptional()`, `@MaxLength(100)` |
| `state` | `ExpenseState?` | `@IsEnum(ExpenseState)`, `@IsOptional()` |
| `file_url` | `string?` | `@IsString()`, `@IsOptional()`, `@MaxLength(500)` |
| `observations` | `string?` | `@IsString()`, `@IsOptional()` |
| `vat_amount` | `number?` | `@IsNumber()`, `@IsOptional()`, `@Min(0)` |
| `vat_rate` | `number?` | `@IsNumber()`, `@IsOptional()`, `@Min(0)`, `@Max(100)` |
| `vat_perception` | `number?` | `@IsNumber()`, `@IsOptional()`, `@Min(0)` |
| `vat_withholding` | `number?` | `@IsNumber()`, `@IsOptional()`, `@Min(0)` |
| `iibb_perception` | `number?` | `@IsNumber()`, `@IsOptional()`, `@Min(0)` |
| `income_tax_withholding` | `number?` | `@IsNumber()`, `@IsOptional()`, `@Min(0)` |

### ✅ Payload Válido Mínimo

```json
{
  "work_id": "123e4567-e89b-12d3-a456-426614174000",
  "rubric_id": "123e4567-e89b-12d3-a456-426614174000",
  "amount": 15000.50,
  "currency": "ARS",
  "purchase_date": "2024-01-15",
  "document_type": "invoice_a"
}
```

### ⚠️ Posibles Causas de 400

1. **Falta algún campo requerido** → 400
2. **UUIDs inválidos** → 400
3. **`amount` < 0** → 400
4. **`currency` no es "ARS" o "USD"** → 400
5. **`purchase_date` formato inválido** → 400
6. **`document_type` enum inválido** → 400
7. **`vat_rate` > 100** → 400

---

## 📋 5. CONTRACTS - CreateContractDto

### Ubicación
`src/contracts/dto/create-contract.dto.ts`

### Campos Requeridos (OBLIGATORIOS)

| Campo | Tipo | Validaciones | Descripción |
|-------|------|--------------|-------------|
| `work_id` | `string` | `@IsUUID()` | **REQUERIDO** - UUID de la obra |
| `supplier_id` | `string` | `@IsUUID()` | **REQUERIDO** - UUID del proveedor |
| `rubric_id` | `string` | `@IsUUID()` | **REQUERIDO** - UUID de la rúbrica |
| `amount_total` | `number` | `@IsNumber()`, `@Min(0)` | **REQUERIDO** - Monto total |
| `currency` | `Currency` | `@IsEnum(Currency)` | **REQUERIDO** - Moneda |

### Campos Opcionales

| Campo | Tipo | Validaciones |
|-------|------|--------------|
| `amount_executed` | `number?` | `@IsNumber()`, `@IsOptional()`, `@Min(0)` |
| `file_url` | `string?` | `@IsString()`, `@IsOptional()`, `@MaxLength(500)` |
| `payment_terms` | `string?` | `@IsString()`, `@IsOptional()` |
| `start_date` | `string?` | `@IsDateString()`, `@IsOptional()` |
| `end_date` | `string?` | `@IsDateString()`, `@IsOptional()` |

### ✅ Payload Válido Mínimo

```json
{
  "work_id": "123e4567-e89b-12d3-a456-426614174000",
  "supplier_id": "123e4567-e89b-12d3-a456-426614174000",
  "rubric_id": "123e4567-e89b-12d3-a456-426614174000",
  "amount_total": 500000,
  "currency": "ARS"
}
```

### ⚠️ Posibles Causas de 400

1. **Falta algún campo requerido** → 400
2. **UUIDs inválidos** → 400
3. **`amount_total` < 0** → 400
4. **`currency` no es "ARS" o "USD"** → 400
5. **Fechas formato inválido** → 400

---

## 🎯 RESUMEN DE CAUSAS COMUNES DE ERROR 400

### 1. Campos Requeridos Faltantes ⚠️ CRÍTICO

**Supplier:**
- ❌ Falta `name`

**Work:**
- ❌ Falta `name`, `client`, `address`, `start_date`, o `currency`

**Cashbox:**
- ❌ Falta `user_id` o `opening_date`

**Expense:**
- ❌ Falta `work_id`, `rubric_id`, `amount`, `currency`, `purchase_date`, o `document_type`

**Contract:**
- ❌ Falta `work_id`, `supplier_id`, `rubric_id`, `amount_total`, o `currency`

### 2. Formato de Fechas Incorrecto ⚠️ CRÍTICO

**Formato esperado:** ISO 8601 string `"YYYY-MM-DD"`

**❌ Formatos que causan 400:**
- `"2024/01/15"` (slash)
- `"15-01-2024"` (DD-MM-YYYY)
- Objetos Date de JavaScript
- Timestamps numéricos

### 3. Propiedades Extra (forbidNonWhitelisted) ⚠️ CRÍTICO

**Si el frontend envía propiedades NO definidas en el DTO → 400**

**Ejemplo:**
```json
// ❌ Causa 400:
{
  "name": "Test",
  "extraField": "value"  // Esta propiedad no está en el DTO
}
```

### 4. Tipos Incorrectos

- UUIDs que no son strings válidos
- Números enviados como strings (excepto fechas)
- Enums con valores incorrectos
- Strings donde se espera número

### 5. Validaciones Falla

- `@MaxLength()` excedido
- `@Min(0)` negativo
- `@IsEmail()` formato inválido
- `@IsUUID()` formato inválido

---

## ✅ CHECKLIST PARA EL FRONTEND

### Antes de enviar request:

- [ ] Todos los campos requeridos están presentes
- [ ] Fechas en formato ISO 8601 (`"YYYY-MM-DD"`)
- [ ] UUIDs son strings válidos
- [ ] Enums usan valores exactos (case-sensitive)
- [ ] No hay propiedades extra no definidas en el DTO
- [ ] Números son tipo `number`, no strings
- [ ] Longitudes de strings respetan `@MaxLength()`
- [ ] Números respetan `@Min()` y `@Max()`

---

## 📝 EJEMPLOS DE ERROR 400 Y CAUSA

### Ejemplo 1: Campo Requerido Faltante

**Request:**
```json
{
  "client": "Cliente Test",
  "address": "Av. Test 123"
}
```

**Error 400:**
```json
{
  "statusCode": 400,
  "message": ["name should not be empty", "start_date should not be empty", "currency should not be empty"],
  "error": "Bad Request"
}
```

**Causa:** Faltan campos requeridos `name`, `start_date`, `currency`

---

### Ejemplo 2: Propiedad Extra

**Request:**
```json
{
  "name": "Proveedor Test",
  "cuit": "12345678",
  "id": "123e4567-e89b-12d3-a456-426614174000"  // ❌ Extra
}
```

**Error 400:**
```json
{
  "statusCode": 400,
  "message": ["property id should not exist"],
  "error": "Bad Request"
}
```

**Causa:** `forbidNonWhitelisted: true` rechaza propiedades extra

---

### Ejemplo 3: Formato de Fecha Incorrecto

**Request:**
```json
{
  "name": "Obra Test",
  "client": "Cliente",
  "address": "Test",
  "start_date": "2024/01/15",  // ❌ Formato incorrecto
  "currency": "ARS"
}
```

**Error 400:**
```json
{
  "statusCode": 400,
  "message": ["start_date must be a valid ISO 8601 date string"],
  "error": "Bad Request"
}
```

**Causa:** Fecha debe ser formato ISO 8601 `"YYYY-MM-DD"`

---

### Ejemplo 4: Enum Incorrecto

**Request:**
```json
{
  "name": "Obra Test",
  "client": "Cliente",
  "address": "Test",
  "start_date": "2024-01-15",
  "currency": "ARS"  // ✅ Correcto
}
```

**Si enviara:**
```json
{
  "currency": "USD"  // ✅ Correcto
}
```

**Pero si enviara:**
```json
{
  "currency": "ars"  // ❌ Lowercase incorrecto
}
```

**Error 400:**
```json
{
  "statusCode": 400,
  "message": ["currency must be one of the following values: ARS, USD"],
  "error": "Bad Request"
}
```

**Causa:** Enum es case-sensitive, debe ser exactamente `"ARS"` o `"USD"`

---

**FIN DEL REPORTE**


