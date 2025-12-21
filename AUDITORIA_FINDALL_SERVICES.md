# 🔍 AUDITORÍA: Métodos findAll() - Riesgo de Excepciones No Controladas (500)

**Fecha:** 2025-01-XX  
**Objetivo:** Identificar métodos `findAll()` que pueden lanzar excepciones no controladas  
**Alcance:** Todos los services del backend PMD

---

## 📊 RESUMEN EJECUTIVO

- **Total de métodos findAll auditados:** 18
- **Con try/catch:** 1 (UsersService)
- **Sin try/catch:** 17
- **Riesgo ALTO:** 9 métodos
- **Riesgo MEDIO:** 6 métodos
- **Riesgo BAJO:** 2 métodos

---

## 🔴 RIESGO ALTO (9 métodos)

### 1. WorksService.findAll()

**Archivo:** `src/works/works.service.ts`  
**Línea:** 30-57  
**Try/Catch:** ❌ NO

**Código:**
```typescript
async findAll(user: User): Promise<Work[]> {
  const organizationId = getOrganizationId(user);
  const queryBuilder = this.workRepository.createQueryBuilder('work');

  if (organizationId) {
    queryBuilder.where('work.organization_id = :organizationId', {
      organizationId,
    });
  }

  if (user.role.name === UserRole.SUPERVISOR) {  // ⚠️ Puede fallar si user.role es null
    // ...
  }

  return await queryBuilder
    .leftJoinAndSelect('work.supervisor', 'supervisor')
    .leftJoinAndSelect('work.budgets', 'budgets')
    .leftJoinAndSelect('work.contracts', 'contracts')
    .getMany();  // ⚠️ Query puede fallar
}
```

**Causa probable:**
- Acceso a `user.role.name` sin validar si `role` es null
- QueryBuilder puede fallar por errores de DB
- Múltiples leftJoinAndSelect pueden fallar si relaciones están corruptas

**Recomendación:**
```typescript
async findAll(user: User): Promise<Work[]> {
  try {
    const organizationId = getOrganizationId(user);
    const queryBuilder = this.workRepository.createQueryBuilder('work');

    if (organizationId) {
      queryBuilder.where('work.organization_id = :organizationId', {
        organizationId,
      });
    }

    if (user?.role?.name === UserRole.SUPERVISOR) {
      // ...
    }

    return await queryBuilder
      .leftJoinAndSelect('work.supervisor', 'supervisor')
      .leftJoinAndSelect('work.budgets', 'budgets')
      .leftJoinAndSelect('work.contracts', 'contracts')
      .getMany();
  } catch (error) {
    console.error('[WorksService.findAll] Error:', error);
    return [];
  }
}
```

---

### 2. ExpensesService.findAll()

**Archivo:** `src/expenses/expenses.service.ts`  
**Línea:** 249-265  
**Try/Catch:** ❌ NO

**Código:**
```typescript
async findAll(user: User): Promise<Expense[]> {
  const queryBuilder = this.expenseRepository
    .createQueryBuilder('expense')
    .leftJoinAndSelect('expense.work', 'work')
    .leftJoinAndSelect('expense.supplier', 'supplier')
    .leftJoinAndSelect('expense.rubric', 'rubric')
    .leftJoinAndSelect('expense.created_by', 'created_by')
    .leftJoinAndSelect('expense.val', 'val')
    .orderBy('expense.created_at', 'DESC');

  if (user.role.name === UserRole.OPERATOR) {  // ⚠️ Puede fallar
    queryBuilder.where('expense.created_by_id = :userId', { userId: user.id });
  }

  return await queryBuilder.getMany();  // ⚠️ Query puede fallar
}
```

**Causa probable:**
- Acceso a `user.role.name` sin validación
- 5 leftJoinAndSelect pueden fallar si relaciones están corruptas
- QueryBuilder puede fallar por errores de DB

**Recomendación:** Agregar try/catch y validación `user?.role?.name`

---

### 3. AlertsService.findAll()

**Archivo:** `src/alerts/alerts.service.ts`  
**Línea:** 165-171  
**Try/Catch:** ❌ NO

**Código:**
```typescript
async findAll(user: User): Promise<Alert[]> {
  return await this.alertRepository.find({
    where: user.role.name === 'operator' ? { user_id: user.id } : {},  // ⚠️ Puede fallar
    relations: ['user', 'work', 'supplier', 'expense', 'contract', 'cashbox'],  // ⚠️ 6 relaciones
    order: { created_at: 'DESC' },
  });
}
```

**Causa probable:**
- Acceso a `user.role.name` sin validación
- 6 relaciones cargadas (alto riesgo de fallo)
- Comparación con string 'operator' en lugar de enum

**Recomendación:** Agregar try/catch y validación `user?.role?.name`

---

### 4. WorkDocumentsService.findAll()

**Archivo:** `src/work-documents/work-documents.service.ts`  
**Línea:** 38-67  
**Try/Catch:** ❌ NO

**Código:**
```typescript
async findAll(workId?: string, user?: User): Promise<WorkDocument[]> {
  const organizationId = user ? getOrganizationId(user) : null;
  const where: any = {};

  if (workId) {
    where.work_id = workId;
    if (organizationId) {
      const work = await this.workRepository.findOne({  // ⚠️ Query adicional puede fallar
        where: { id: workId },
      });
      if (work && work.organization_id !== organizationId) {
        throw new ForbiddenException('Work does not belong to your organization');
      }
    }
  } else if (organizationId) {
    const works = await this.workRepository.find({  // ⚠️ Query adicional puede fallar
      where: { organization_id: organizationId },
      select: ['id'],
    });
    where.work_id = works.map((w) => w.id);
  }

  return await this.workDocumentRepository.find({  // ⚠️ Query puede fallar
    where,
    relations: ['work'],
    order: { created_at: 'DESC' },
  });
}
```

**Causa probable:**
- Múltiples queries anidadas pueden fallar
- Queries adicionales antes de la principal
- Validación de organización que puede fallar

**Recomendación:** Agregar try/catch envolviendo toda la lógica

---

### 5. CashboxesService.findAll()

**Archivo:** `src/cashboxes/cashboxes.service.ts`  
**Línea:** 59-74  
**Try/Catch:** ❌ NO

**Código:**
```typescript
async findAll(user: User): Promise<Cashbox[]> {
  if (user.role.name === UserRole.OPERATOR) {  // ⚠️ Puede fallar
    return await this.cashboxRepository.find({
      where: { user_id: user.id },
      relations: ['user', 'movements'],
      order: { created_at: 'DESC' },
    });
  }

  return await this.cashboxRepository.find({
    relations: ['user', 'movements'],
    order: { created_at: 'DESC' },
  });
}
```

**Causa probable:**
- Acceso a `user.role.name` sin validación
- Dos paths de query diferentes pueden fallar
- Relaciones `movements` puede ser pesada

**Recomendación:** Agregar try/catch y validación `user?.role?.name`

---

### 6. IncomesService.findAll()

**Archivo:** `src/incomes/incomes.service.ts`  
**Línea:** 44-49  
**Try/Catch:** ❌ NO

**Código:**
```typescript
async findAll(user: User): Promise<Income[]> {
  return await this.incomeRepository.find({
    relations: ['work'],
    order: { date: 'DESC' },
  });
}
```

**Causa probable:**
- Query simple pero sin try/catch
- Relación `work` puede fallar si está corrupta
- No filtra por organización (puede retornar datos incorrectos pero no es 500)

**Recomendación:** Agregar try/catch simple

---

### 7. ContractsService.findAll()

**Archivo:** `src/contracts/contracts.service.ts`  
**Línea:** 51-56  
**Try/Catch:** ❌ NO

**Código:**
```typescript
async findAll(user: User): Promise<Contract[]> {
  return await this.contractRepository.find({
    relations: ['work', 'supplier', 'rubric'],
    order: { created_at: 'DESC' },
  });
}
```

**Causa probable:**
- 3 relaciones cargadas pueden fallar
- No filtra por organización (puede retornar datos incorrectos pero no es 500)

**Recomendación:** Agregar try/catch simple

---

### 8. CashMovementsService.findAll()

**Archivo:** `src/cash-movements/cash-movements.service.ts`  
**Línea:** 21-26  
**Try/Catch:** ❌ NO

**Código:**
```typescript
async findAll(user: User): Promise<CashMovement[]> {
  return await this.cashMovementRepository.find({
    relations: ['cashbox', 'expense', 'income'],
    order: { date: 'DESC' },
  });
}
```

**Causa probable:**
- 3 relaciones cargadas pueden fallar
- No filtra por organización

**Recomendación:** Agregar try/catch simple

---

### 9. AccountingService.findAll()

**Archivo:** `src/accounting/accounting.service.ts`  
**Línea:** 50-63  
**Try/Catch:** ❌ NO

**Código:**
```typescript
async findAll(user: User): Promise<AccountingRecord[]> {
  const organizationId = getOrganizationId(user);
  const where: any = {};
  
  if (organizationId) {
    where.organization_id = organizationId;
  }

  return await this.accountingRepository.find({
    where,
    relations: ['expense', 'work', 'supplier'],
    order: { date: 'DESC', created_at: 'DESC' },
  });
}
```

**Causa probable:**
- 3 relaciones cargadas pueden fallar
- Helper `getOrganizationId` puede fallar si user es malformado

**Recomendación:** Agregar try/catch simple

---

## 🟡 RIESGO MEDIO (6 métodos)

### 10. SuppliersService.findAll()

**Archivo:** `src/suppliers/suppliers.service.ts`  
**Línea:** 179-192  
**Try/Catch:** ❌ NO

**Código:**
```typescript
async findAll(user: User): Promise<Supplier[]> {
  const organizationId = getOrganizationId(user);
  const where: any = {};
  
  if (organizationId) {
    where.organization_id = organizationId;
  }

  return await this.supplierRepository.find({
    where,
    relations: ['documents'],
    order: { created_at: 'DESC' },
  });
}
```

**Riesgo MEDIO porque:**
- Solo 1 relación
- Helper puede fallar pero es defensivo
- Query simple

**Recomendación:** Agregar try/catch simple

---

### 11. ScheduleService.findAll()

**Archivo:** `src/schedule/schedule.service.ts`  
**Línea:** 23-28  
**Try/Catch:** ❌ NO

**Código:**
```typescript
async findAll(user: User): Promise<Schedule[]> {
  return await this.scheduleRepository.find({
    relations: ['work'],
    order: { order: 'ASC', start_date: 'ASC' },
  });
}
```

**Riesgo MEDIO porque:**
- Solo 1 relación
- Query simple

**Recomendación:** Agregar try/catch simple

---

### 12. ValService.findAll()

**Archivo:** `src/val/val.service.ts`  
**Línea:** 21-26  
**Try/Catch:** ❌ NO

**Código:**
```typescript
async findAll(user: User): Promise<Val[]> {
  return await this.valRepository.find({
    relations: ['expense'],
    order: { code: 'ASC' },
  });
}
```

**Riesgo MEDIO porque:**
- Solo 1 relación
- Query simple

**Recomendación:** Agregar try/catch simple

---

### 13. RolesService.findAll()

**Archivo:** `src/roles/roles.service.ts`  
**Línea:** 20-22  
**Try/Catch:** ❌ NO

**Código:**
```typescript
async findAll(): Promise<Role[]> {
  return await this.roleRepository.find();
}
```

**Riesgo MEDIO porque:**
- Sin relaciones
- Query muy simple
- Pero roles son críticos y pueden fallar por DB

**Recomendación:** Agregar try/catch simple

---

### 14. RubricsService.findAll()

**Archivo:** `src/rubrics/rubrics.service.ts`  
**Línea:** 20-25  
**Try/Catch:** ❌ NO

**Código:**
```typescript
async findAll(): Promise<Rubric[]> {
  return await this.rubricRepository.find({
    where: { is_active: true },
    order: { name: 'ASC' },
  });
}
```

**Riesgo MEDIO porque:**
- Sin relaciones
- Query simple con filtro

**Recomendación:** Agregar try/catch simple

---

### 15. AuditService.findAll()

**Archivo:** `src/audit/audit.service.ts`  
**Línea:** 20-26  
**Try/Catch:** ❌ NO

**Código:**
```typescript
async findAll(): Promise<AuditLog[]> {
  return await this.auditLogRepository.find({
    relations: ['user'],
    order: { created_at: 'DESC' },
    take: 1000,
  });
}
```

**Riesgo MEDIO porque:**
- Solo 1 relación
- Tiene límite (take: 1000) que puede fallar si es muy grande
- Query puede ser lenta pero no debería fallar

**Recomendación:** Agregar try/catch simple

---

## 🟢 RIESGO BAJO (2 métodos)

### 16. WorkBudgetsService.findAll()

**Archivo:** `src/work-budgets/work-budgets.service.ts`  
**Línea:** 40-45  
**Try/Catch:** ❌ NO

**Código:**
```typescript
async findAll(): Promise<WorkBudget[]> {
  return await this.workBudgetRepository.find({
    relations: ['work'],
    order: { created_at: 'DESC' },
  });
}
```

**Riesgo BAJO porque:**
- Solo 1 relación
- Query simple
- Probablemente poco uso

**Recomendación:** Agregar try/catch simple (preventivo)

---

### 17. SupplierDocumentsService.findAll()

**Archivo:** `src/supplier-documents/supplier-documents.service.ts`  
**Línea:** 31-36  
**Try/Catch:** ❌ NO

**Código:**
```typescript
async findAll(): Promise<SupplierDocument[]> {
  return await this.supplierDocumentRepository.find({
    relations: ['supplier'],
    order: { expiration_date: 'ASC' },
  });
}
```

**Riesgo BAJO porque:**
- Solo 1 relación
- Query simple

**Recomendación:** Agregar try/catch simple (preventivo)

---

## ✅ YA PROTEGIDO (1 método)

### 18. UsersService.findAll()

**Archivo:** `src/users/users.service.ts`  
**Línea:** 71-90  
**Try/Catch:** ✅ SÍ

**Código:**
```typescript
async findAll(user?: User): Promise<any[]> {
  try {
    const organizationId = user ? getOrganizationId(user) : null;
    const where: any = {};
    
    if (organizationId) {
      where.organization_id = organizationId;
    }

    const users = await this.userRepository.find({
      where,
      relations: ['role', 'organization'],
    });

    return users.map((u) => this.normalizeUserEntity(u));
  } catch (error) {
    console.error('[UsersService.findAll] Error:', error);
    return [];
  }
}
```

**Estado:** ✅ Ya tiene protección completa

---

## 📋 RESUMEN POR PRIORIDAD

### Prioridad CRÍTICA (Arreglar primero):

1. **WorksService.findAll()** - Acceso a `user.role.name` sin validación
2. **ExpensesService.findAll()** - Acceso a `user.role.name` sin validación + 5 relaciones
3. **AlertsService.findAll()** - Acceso a `user.role.name` sin validación + 6 relaciones
4. **WorkDocumentsService.findAll()** - Queries anidadas sin protección

### Prioridad ALTA:

5. CashboxesService.findAll() - Acceso a `user.role.name`
6. IncomesService.findAll() - Sin protección
7. ContractsService.findAll() - 3 relaciones sin protección
8. CashMovementsService.findAll() - 3 relaciones sin protección
9. AccountingService.findAll() - 3 relaciones sin protección

### Prioridad MEDIA:

10-15. Resto de services con riesgo medio/bajo

---

## 🛠️ PATRÓN DE FIX RECOMENDADO

**Para métodos que acceden a `user.role.name`:**

```typescript
async findAll(user: User): Promise<Entity[]> {
  try {
    // Validar acceso a role
    if (user?.role?.name === UserRole.OPERATOR) {
      // ...
    }
    
    // Resto de lógica
    return await this.repository.find({ ... });
  } catch (error) {
    console.error('[ServiceName.findAll] Error:', error);
    return [];
  }
}
```

**Para métodos simples sin acceso a role:**

```typescript
async findAll(): Promise<Entity[]> {
  try {
    return await this.repository.find({
      relations: ['relation'],
      order: { field: 'ASC' },
    });
  } catch (error) {
    console.error('[ServiceName.findAll] Error:', error);
    return [];
  }
}
```

---

## ⚠️ NOTAS IMPORTANTES

1. **NO modificar:** Auth, Guards, Controllers, DTOs
2. **Solo agregar:** try/catch en métodos findAll
3. **Retornar:** Array vacío `[]` en caso de error
4. **Loggear:** Errores con `console.error` con contexto
5. **Mantener:** Firma del método intacta
6. **No refactorizar:** Solo agregar protección mínima

---

## ✅ VALIDACIONES FINALES

- [x] 18 métodos auditados
- [x] Riesgos identificados y categorizados
- [x] Recomendaciones específicas por método
- [x] Patrón de fix proporcionado
- [x] No se modificó código (solo auditoría)

---

**FIN DEL REPORTE**

