# Permissions Mapping - PMD Management System

## Overview

This document describes the permissions mapping for each role in the PMD Management System. Permissions are stored in the `roles` table as JSONB and enforced through the `RolesGuard`.

## Role Hierarchy

```
Direction (Highest)
    ↓
Supervisor
    ↓
Administration
    ↓
Operator (Lowest)
```

## Direction Role

**Full system access with override permissions**

### Permissions
- ✅ **Users:** Create, Read, Update, Delete
- ✅ **Roles:** Create, Read, Update, Delete
- ✅ **Works:** Create, Read, Update, Delete
- ✅ **Expenses:** Create, Read, Update, Delete, Validate
- ✅ **Suppliers:** Create, Read, Update, Delete, Approve, Reject
- ✅ **Contracts:** Create, Read, Update, Delete, Override (unblock)
- ✅ **Cashboxes:** Create, Read, Update, Delete, Close, Approve
- ✅ **Accounting:** Create, Read, Update, Delete, Close, **Reopen** (unique)
- ✅ **Reports:** Read

### Special Overrides
- Can override blocked contracts
- Can reopen closed months
- Can modify any user's data
- Can delete any record

### Use Cases
- System administration
- Emergency overrides
- Month reopening
- Contract unblocking

## Supervisor Role

**Work oversight and schedule management**

### Permissions
- ✅ **Works:** Read, Update (progress, status)
- ✅ **Expenses:** Read (all)
- ✅ **Suppliers:** Read (all)
- ✅ **Contracts:** Read (all)
- ✅ **Cashboxes:** Read (all)
- ✅ **Schedule:** Read, Update (mark stages as completed)
- ✅ **Reports:** Read

### Restrictions
- ❌ Cannot create expenses
- ❌ Cannot validate expenses
- ❌ Cannot modify accounting
- ❌ Cannot change tax settings
- ❌ Cannot modify roles
- ❌ Cannot approve suppliers
- ❌ Cannot close cashboxes

### Use Cases
- Monitor work progress
- Complete schedule stages
- View all financial data
- Generate reports

## Administration Role

**Validation and approval permissions**

### Permissions
- ✅ **Works:** Read
- ✅ **Expenses:** Read, **Validate** (unique)
- ✅ **Suppliers:** Read, **Approve**, **Reject** (unique)
- ✅ **Contracts:** Create, Read, Update
- ✅ **Cashboxes:** Read, **Approve** differences (unique)
- ✅ **Accounting:** Create, Read, Update, **Close** months (unique)
- ✅ **Reports:** Read, Generate

### Restrictions
- ❌ Cannot reopen closed months (Direction only)
- ❌ Cannot override blocked contracts (Direction only)
- ❌ Cannot manage users/roles (Direction only)
- ❌ Cannot delete critical records

### Use Cases
- Validate expenses
- Approve/reject suppliers
- Close accounting months
- Approve cashbox differences
- Generate reports

## Operator Role

**Limited access to own resources**

### Permissions
- ✅ **Works:** Read
- ✅ **Expenses:** Create, Read (own only)
- ✅ **Suppliers:** Create (provisional only), Read
- ✅ **Cashboxes:** Create, Read (own only), Close (own only)

### Restrictions
- ❌ Cannot validate expenses
- ❌ Cannot approve suppliers
- ❌ Cannot manage contracts
- ❌ Cannot access accounting
- ❌ Cannot view other operators' cashboxes
- ❌ Cannot view other operators' expenses
- ❌ Cannot change supplier status
- ❌ Cannot modify roles

### Use Cases
- Record expenses
- Create provisional suppliers
- Manage own cashbox
- View own work assignments

## Permission Matrix

| Action | Direction | Supervisor | Administration | Operator |
|--------|-----------|------------|-----------------|----------|
| **Users** |
| Create User | ✅ | ❌ | ❌ | ❌ |
| Read Users | ✅ | ❌ | ❌ | ❌ |
| Update User | ✅ | ❌ | ❌ | ❌ |
| Delete User | ✅ | ❌ | ❌ | ❌ |
| **Roles** |
| Manage Roles | ✅ | ❌ | ❌ | ❌ |
| **Works** |
| Create Work | ✅ | ❌ | ❌ | ❌ |
| Read Works | ✅ | ✅ | ✅ | ✅ |
| Update Work | ✅ | ✅ (limited) | ❌ | ❌ |
| Delete Work | ✅ | ❌ | ❌ | ❌ |
| **Expenses** |
| Create Expense | ✅ | ❌ | ❌ | ✅ |
| Read Expenses | ✅ (all) | ✅ (all) | ✅ (all) | ✅ (own) |
| Validate Expense | ✅ | ❌ | ✅ | ❌ |
| Update Expense | ✅ | ❌ | ❌ | ❌ |
| Delete Expense | ✅ | ❌ | ❌ | ❌ |
| **Suppliers** |
| Create Supplier | ✅ | ❌ | ❌ | ✅ (provisional) |
| Read Suppliers | ✅ | ✅ | ✅ | ✅ |
| Approve Supplier | ✅ | ❌ | ✅ | ❌ |
| Reject Supplier | ✅ | ❌ | ✅ | ❌ |
| Update Supplier | ✅ | ❌ | ✅ | ❌ (status only) |
| **Contracts** |
| Create Contract | ✅ | ❌ | ✅ | ❌ |
| Read Contracts | ✅ | ✅ | ✅ | ❌ |
| Update Contract | ✅ | ❌ | ✅ | ❌ |
| Override Blocked | ✅ | ❌ | ❌ | ❌ |
| **Cashboxes** |
| Create Cashbox | ✅ | ❌ | ❌ | ✅ |
| Read Cashboxes | ✅ (all) | ✅ (all) | ✅ (all) | ✅ (own) |
| Close Cashbox | ✅ | ❌ | ❌ | ✅ (own) |
| Approve Difference | ✅ | ❌ | ✅ | ❌ |
| **Accounting** |
| Create Record | ✅ | ❌ | ✅ | ❌ |
| Read Records | ✅ | ❌ | ✅ | ❌ |
| Update Record | ✅ | ❌ | ✅ | ❌ |
| Close Month | ✅ | ❌ | ✅ | ❌ |
| Reopen Month | ✅ | ❌ | ❌ | ❌ |
| **Reports** |
| Generate Reports | ✅ | ✅ | ✅ | ❌ |

## Business Rule Permissions

### Expense Validation
- **Who can validate:** Administration, Direction
- **Who cannot:** Supervisor, Operator
- **Rule:** Only validated expenses create accounting records

### Supplier Approval
- **Who can approve:** Administration, Direction
- **Who cannot:** Supervisor, Operator
- **Rule:** Operators can create provisional suppliers, but cannot approve them

### Contract Override
- **Who can override:** Direction only
- **Rule:** When contract balance reaches zero, only Direction can unblock

### Month Reopening
- **Who can reopen:** Direction only
- **Rule:** Once a month is closed, only Direction can reopen it

### Cashbox Difference Approval
- **Who can approve:** Administration, Direction
- **Rule:** When cashbox is closed with differences, Administration or Direction must approve

## Implementation

Permissions are enforced through:

1. **RolesGuard** - Checks role permissions before allowing access
2. **@Roles() decorator** - Defines required roles for endpoints
3. **Service-level checks** - Additional business rule validation

### Example Usage

```typescript
// Controller
@Post('validate')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATION, UserRole.DIRECTION)
async validateExpense(@Param('id') id: string) {
  // Only Administration and Direction can access
}

// Service
async validateExpense(id: string, user: User) {
  if (user.role.name !== UserRole.ADMINISTRATION && 
      user.role.name !== UserRole.DIRECTION) {
    throw new ForbiddenException('Only Administration and Direction can validate expenses');
  }
  // Validation logic
}
```

## Default Permissions (from Seed)

The seed script creates roles with the following permission structures:

```json
{
  "users": ["create", "read", "update", "delete"],
  "expenses": ["create", "read", "validate"],
  "suppliers": ["create", "read", "approve", "reject"],
  // ... etc
}
```

## Customization

To modify permissions:

1. Update the seed script (`src/seed.ts`)
2. Run the seed script again (idempotent - will update existing roles)
3. Or manually update the `permissions` JSONB column in the `roles` table

## Notes

- Direction has implicit full access (checked first in RolesGuard)
- Operator access is restricted to own resources (checked in services)
- Some permissions are enforced at both guard and service level for security
- Permissions can be extended by adding new keys to the JSONB structure


