# Swagger Documentation Implementation Guide

This document outlines the Swagger/OpenAPI documentation implementation for the PMD Management System.

## Implementation Status

### ✅ Completed
- Main Swagger configuration (`src/main.ts`)
- Authentication endpoints
- Expenses module (controller + DTOs)
- Cashboxes module (controller)
- Suppliers module (controller)

### 🔄 In Progress
- Remaining DTOs need @ApiProperty decorators
- Remaining controllers need @ApiTags, @ApiOperation, @ApiResponse decorators

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

## Remaining Modules to Document

1. Users
2. Roles
3. Supplier Documents
4. Works
5. Work Budgets
6. Contracts
7. Rubrics
8. VAL
9. Incomes
10. Cash Movements
11. Schedule
12. Alerts
13. Accounting
14. Audit

