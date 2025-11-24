# Seed Data Summary - PMD Management System

## Overview

This document summarizes all seed data generated for the PMD Management System, including roles, users, and sample data for development and testing.

## Files Generated

1. ✅ **`src/seed.ts`** - Main seeding script with idempotent logic
2. ✅ **`env.example`** - Environment variables template
3. ✅ **`SEEDING_GUIDE.md`** - Complete seeding documentation
4. ✅ **`PERMISSIONS_MAPPING.md`** - Detailed permissions documentation
5. ✅ **`package.json`** - Updated with `npm run seed` script

## Default Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **Direction** | Full system access | All permissions + overrides |
| **Supervisor** | Work oversight | View all, complete stages |
| **Administration** | Validation & approval | Validate expenses, approve suppliers, close months |
| **Operator** | Limited access | Own resources only, create provisional suppliers |

## Default Users

| Email | Role | Password | Use Case |
|-------|------|----------|----------|
| direction@pmd.com | Direction | password123 | System administration |
| supervisor@pmd.com | Supervisor | password123 | Work oversight |
| admin@pmd.com | Administration | password123 | Expense validation, supplier approval |
| operator1@pmd.com | Operator | password123 | Expense recording |
| operator2@pmd.com | Operator | password123 | Expense recording |

## Sample Data Created

### Rubrics (5)
- Materials (MAT)
- Labor (LAB)
- Services (SRV)
- Equipment (EQP)
- Transport (TRN)

### Suppliers (3)
1. **Construcciones ABC S.A.** (Approved)
   - CUIT: 30-12345678-9
   - Documents: ART, AFIP

2. **Materiales XYZ S.R.L.** (Approved)
   - CUIT: 30-87654321-0
   - Documents: ART

3. **Servicios Técnicos DEF** (Provisional)
   - CUIT: 20-11223344-5
   - Documents: ART (expiring soon)

### Works (3)
1. **Obra Residencial Palermo**
   - Status: Active
   - Currency: ARS
   - Budget: $50,000,000 ARS
   - Supervisor: supervisor@pmd.com

2. **Edificio Corporativo Microcentro**
   - Status: Active
   - Currency: USD
   - Budget: $2,000,000 USD
   - Supervisor: supervisor@pmd.com

3. **Remodelación Comercial Recoleta**
   - Status: Paused
   - Currency: ARS
   - Budget: $15,000,000 ARS
   - Supervisor: supervisor@pmd.com

### Contracts (3)
1. Labor contract - 20M ARS (5M executed)
2. Materials contract - 15M ARS (fully executed - **blocked**)
3. Services contract - 500K USD (not started)

### Cashboxes (2)
1. **Operator 1** - Open cashbox
   - Opening balance: 50,000 ARS, 500 USD
   - Status: Open

2. **Operator 2** - Closed cashbox
   - Opening balance: 30,000 ARS, 300 USD
   - Closing balance: 25,000 ARS, 250 USD
   - Difference: -5,000 ARS, -50 USD (approved)
   - Status: Closed

### Expenses (3)
1. Validated expense - 500,000 ARS (Invoice A)
2. Pending expense - 300,000 ARS (Invoice B)
3. Pending expense - 5,000 USD (VAL - auto-generated)

### Incomes (3)
1. Advance payment - 10M ARS (Obra Residencial Palermo)
2. Certification - 5M ARS (Obra Residencial Palermo)
3. Advance payment - 500K USD (Edificio Corporativo Microcentro)

## Environment Variables

### Required Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=pmd_management

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRATION=1h

# Application
APP_PORT=3000
NODE_ENV=development
```

### Optional Variables

```env
# Storage Adapters
DRIVE_ADAPTER_KEYS={...}
DROPBOX_ACCESS_TOKEN=...

# Test Database
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_USERNAME=postgres
TEST_DB_PASSWORD=postgres
TEST_DB_DATABASE=pmd_management_test
```

## Running the Seed

### Quick Start

```bash
# 1. Copy environment file
cp env.example .env

# 2. Edit .env with your database credentials

# 3. Run migrations (if using migrations)
npm run migration:run

# 4. Run seed
npm run seed
```

### Verification

After seeding, test login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pmd.com","password":"password123"}'
```

## Idempotent Seeding

The seed script is **idempotent** - you can run it multiple times safely:

- ✅ Existing records are skipped
- ✅ New records are created
- ✅ Permissions are updated for existing roles
- ✅ No duplicate data

## Permissions Structure

Each role has a `permissions` JSONB field with structure:

```json
{
  "users": ["create", "read", "update", "delete"],
  "expenses": ["create", "read", "validate"],
  "suppliers": ["create", "read", "approve", "reject"],
  "contracts": ["create", "read", "update", "delete", "override"],
  "cashboxes": ["create", "read", "update", "delete", "close", "approve"],
  "accounting": ["create", "read", "update", "delete", "close", "reopen"],
  "reports": ["read"]
}
```

## Testing Scenarios

The seed data supports testing:

1. **Expense Validation Flow**
   - Pending expense ready for validation
   - Validated expense with accounting record

2. **Supplier Approval Flow**
   - Provisional supplier ready for approval
   - Approved suppliers with documents

3. **Contract Blocking**
   - Fully executed contract (blocked)
   - Active contracts with remaining balance

4. **Cashbox Management**
   - Open cashbox with movements
   - Closed cashbox with approved difference

5. **Multi-Currency**
   - Works in ARS and USD
   - Expenses and incomes in both currencies

6. **ART Expiration**
   - Supplier with expiring ART (for testing alerts)

## Production Considerations

⚠️ **Never use seed data in production!**

For production:
1. Remove default users from seed script
2. Create users manually with strong passwords
3. Only seed reference data (roles, rubrics)
4. Use environment-specific seed scripts

## Next Steps

After seeding:

1. ✅ Test login with all users
2. ✅ Verify role-based access control
3. ✅ Test business flows (expense validation, supplier approval, etc.)
4. ✅ Explore data via Swagger UI (`/api/docs`)
5. ✅ Run integration tests

## Support

- See `SEEDING_GUIDE.md` for detailed instructions
- See `PERMISSIONS_MAPPING.md` for permissions details
- Check API documentation at `/api/docs`


