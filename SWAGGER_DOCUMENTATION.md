# Swagger Documentation Implementation Guide

This document outlines the Swagger/OpenAPI documentation implementation for the PMD Management System.

**Última actualización:** 2025-01-01  
**Estado general:** ✅ Mayoría de módulos documentados

## Implementation Status

### ✅ Fully Documented Modules
- **Main Swagger configuration** (`src/main.ts`) - Configuración completa con todos los tags
- **Authentication** (`auth.controller.ts`) - Endpoints de login, registro, etc.
- **Expenses** (`expenses.controller.ts`) - Gestión completa de gastos
- **Cashboxes** (`cashboxes.controller.ts`) - Gestión de cajas con refuerzos, diferencias, historial
- **Suppliers** (`suppliers.controller.ts`) - Gestión de proveedores
- **Contracts** (`contracts.controller.ts`) - Gestión de contratos con estados
- **Accounting** (`accounting.controller.ts`) - Registros contables y reportes (Libro de Compras, Percepciones, Retenciones)
- **Alerts** (`alerts.controller.ts`) - Sistema de alertas con asignación y resolución
- **Exchange Rates** (`exchange-rates.controller.ts`) - Gestión de tipos de cambio
- **Backups** (`backup.controller.ts`) - Gestión de backups automáticos y manuales
- **Offline** (`offline.controller.ts`) - Modo offline y sincronización
- **Audit** (`audit.controller.ts`) - Registro de auditoría
- **Health** (`health.controller.ts`) - Health check endpoints
- **Work Documents** (`work-documents.controller.ts`) - Documentos de obra

### 🔄 Partially Documented
Algunos módulos pueden tener documentación básica pero podrían necesitar mejoras en descripciones o ejemplos adicionales.

### ⚠️ Needs Review/Enhancement
Los siguientes módulos pueden requerir revisión para asegurar documentación completa:
- Users
- Roles
- Supplier Documents
- Works
- Work Budgets
- Rubrics
- VAL
- Incomes
- Cash Movements
- Schedule
- Dashboard

## Pattern for Adding Swagger Decorators

### Controllers Pattern:
```typescript
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('ModuleName')
@ApiBearerAuth('JWT-auth')
@Controller('endpoint')
export class Controller {
  @Get()
  @ApiOperation({ summary: 'Description', description: 'Detailed description' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  method() {}
}
```

### DTOs Pattern:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Dto {
  @ApiProperty({
    description: 'Field description',
    example: 'example value',
    type: String,
  })
  field: string;

  @ApiPropertyOptional({
    description: 'Optional field',
    example: 'optional value',
  })
  optionalField?: string;
}
```

## Swagger Configuration

### Main Configuration (`src/main.ts`)

```typescript
const config = new DocumentBuilder()
  .setTitle('PMD Management System API')
  .setDescription('Complete API documentation...')
  .setVersion('1.0')
  .addBearerAuth(/* JWT configuration */)
  .addTag('Authentication', 'User authentication endpoints')
  .addTag('Users', 'User management endpoints')
  .addTag('Roles', 'Role management endpoints')
  // ... todos los tags están definidos
  .build();
```

### Accessing Swagger Documentation

- **Development:** http://localhost:5000/api/docs
- **Production:** https://your-domain.com/api/docs

### Authentication

All endpoints (except authentication) require JWT Bearer token authentication. Use the "Authorize" button in Swagger UI to set your token.

## API Features Documented

### Core Features
- ✅ Authentication & Authorization (JWT)
- ✅ User and Role Management
- ✅ Work/Project Management
- ✅ Expense Management with validation workflow
- ✅ Supplier Management with approval workflow
- ✅ Contract Management with auto-blocking
- ✅ Cashbox Management with refills and difference approval
- ✅ Accounting Records with month closing
- ✅ Accounting Reports (Purchases Book, Perceptions, Withholdings)

### Advanced Features
- ✅ Alert System with assignment and resolution
- ✅ Schedule/Gantt Management with automatic generation
- ✅ Exchange Rate Management
- ✅ Offline Mode and Synchronization
- ✅ Backup Management (automatic and manual)
- ✅ Audit Logging
- ✅ Health Checks

## Documentation Standards

### Response Codes
All endpoints document standard response codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found
- `409` - Conflict (Duplicate resources)
- `500` - Internal Server Error

### Request/Response Examples
Most endpoints include example request/response bodies in Swagger UI for easy testing.

## Future Enhancements

- [ ] Add more detailed examples for complex endpoints
- [ ] Document error response schemas consistently
- [ ] Add request/response validation rules documentation
- [ ] Create Postman collection from Swagger spec
- [ ] Document rate limiting and throttling
- [ ] Add API versioning documentation

