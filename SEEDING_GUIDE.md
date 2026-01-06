# Database Seeding Guide - PMD Management System

## Overview

This guide explains how to seed the PMD Management System database with default roles, users, and sample data for development and testing purposes.

## What Gets Seeded

The seed script creates the following data:

### 1. Default Roles
- **Direction** - Full system access with override permissions
- **Supervisor** - Work oversight and schedule management
- **Administration** - Validation and approval permissions
- **Operator** - Limited access to own resources

### 2. Default Users
- `direction@pmd.com` - Direction role
- `supervisor@pmd.com` - Supervisor role
- `admin@pmd.com` - Administration role
- `operator@pmd.com` - Operator role
- `operator2@pmd.com` - Operator role

**Default Password:** `password123` (for all users)

### 3. Sample Data
- **Rubrics:** Materials, Labor, Services, Equipment, Transport
- **Suppliers:** 3 suppliers (2 approved, 1 provisional) with documents
- **Works:** 3 sample works with different statuses
- **Budgets:** Initial and addenda budgets for works
- **Contracts:** Sample contracts (including one fully executed/blocked)
- **Cashboxes:** Open and closed cashboxes with movements
- **Expenses:** Sample expenses in different states
- **Incomes:** Sample income records for works

## Prerequisites

1. **PostgreSQL Database** must be running and accessible
2. **Environment Variables** configured (see `.env.example`)
3. **Database Migrations** must be run first (if using migrations)

## Setup

### 1. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure your database connection:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=pmd_management
```

### 2. Run Database Migrations (if applicable)

If you're using migrations, run them first:

```bash
npm run migration:run
```

Or if using TypeORM CLI:

```bash
npm run typeorm migration:run
```

### 3. Install Dependencies

Ensure all dependencies are installed:

```bash
npm install
```

## Running the Seed Script

### Method 1: Using npm script (Recommended - Local)

```bash
npm run seed
```

**Requisitos:**
- Variables de entorno configuradas (`.env` o `.env.development`)
- Base de datos PostgreSQL corriendo y accesible
- Migraciones ejecutadas previamente

### Method 2: Using Docker Compose (Recomendado - Docker)

```bash
# Ejecutar seed en un contenedor temporal (sin iniciar la API)
docker-compose run --rm api npm run seed
```

**Ventajas:**
- No necesitas instalar dependencias localmente
- Usa las mismas variables de entorno que los otros servicios
- Espera automáticamente a que PostgreSQL esté listo

### Method 3: Inside running container

```bash
# Si la API ya está corriendo
docker-compose exec api npm run seed
```

### Method 4: Using ts-node directly

```bash
npx ts-node src/seed.ts
```

### Method 5: Using tsx (if installed)

```bash
npx tsx src/seed.ts
```

## Idempotent Seeding

The seed script is **idempotent**, meaning you can run it multiple times without creating duplicate records. The script checks for existing records before creating new ones:

- **Roles:** Checks by `name`
- **Users:** Checks by `email`
- **Suppliers:** Checks by `cuit`
- **Works:** Checks by `name`
- **Other entities:** Checks by unique combinations of fields

If a record already exists, the script will:
- Log that it already exists
- Skip creating a duplicate
- Continue with the next record

## Verification

After seeding, verify the data was created:

### 1. Check Roles

```bash
# Using psql
psql -U postgres -d pmd_management -c "SELECT name, description FROM roles;"
```

### 2. Check Users

```bash
psql -U postgres -d pmd_management -c "SELECT email, name, role_id FROM users;"
```

### 3. Login Test

Try logging in with one of the seeded users:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pmd.com","password":"password123"}'
```

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Direction | direction@pmd.com | password123 |
| Supervisor | supervisor@pmd.com | password123 |
| Administration | admin@pmd.com | password123 |
| Operator 1 | operator@pmd.com | password123 |
| Operator 2 | operator2@pmd.com | password123 |

⚠️ **Important:** Change these passwords in production!

## Sample Data Details

### Works

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

### Suppliers

1. **Construcciones ABC S.A.**
   - Status: Approved
   - CUIT: 30-12345678-9
   - Documents: ART, AFIP

2. **Materiales XYZ S.R.L.**
   - Status: Approved
   - CUIT: 30-87654321-0
   - Documents: ART

3. **Servicios Técnicos DEF**
   - Status: Provisional
   - CUIT: 20-11223344-5
   - Documents: ART (expiring soon for testing)

### Contracts

- Contract 1: Labor contract (20M ARS, 5M executed)
- Contract 2: Materials contract (15M ARS, fully executed - blocked)
- Contract 3: Services contract (500K USD, not started)

### Cashboxes

- Operator 1: Open cashbox with 50,000 ARS and 500 USD
- Operator 2: Closed cashbox with approved difference

## Troubleshooting

### Error: Cannot connect to database

**Solution:** Check your database connection settings in `.env`:
- Verify PostgreSQL is running
- Check DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD
- Ensure database exists: `CREATE DATABASE pmd_management;`

### Error: Relation does not exist

**Solution:** Run migrations first:
```bash
npm run migration:run
```

### Error: Duplicate key violation

**Solution:** The seed script is idempotent, but if you see this error:
- Check if data already exists
- The script should skip duplicates automatically
- If error persists, manually clean the database

### Error: bcrypt module not found

**Solution:** Install dependencies:
```bash
npm install
```

## Resetting the Database

To start fresh:

### Option 1: Drop and recreate database

```bash
# Drop database
psql -U postgres -c "DROP DATABASE IF EXISTS pmd_management;"

# Create database
psql -U postgres -c "CREATE DATABASE pmd_management;"

# Run migrations
npm run migration:run

# Run seed
npm run seed
```

### Option 2: Use TypeORM synchronize (Development only)

⚠️ **Warning:** Only use in development!

```typescript
// In database.config.ts
synchronize: true, // This will drop and recreate tables
```

## Customizing Seed Data

To customize the seed data:

1. Edit `src/seed.ts`
2. Modify the data arrays (roles, users, suppliers, etc.)
3. Run the seed script again

The script will:
- Create new records that don't exist
- Skip existing records (idempotent)
- Update permissions for existing roles

## Production Considerations

⚠️ **Never run seed script in production without modification!**

For production:
1. Remove or comment out default users creation
2. Use strong, unique passwords
3. Create users manually or through admin interface
4. Only seed roles and reference data (rubrics, etc.)

## Permissions Mapping

### Direction
- Full access to all modules
- Can override blocked contracts
- Can reopen closed months
- Can manage all users and roles

### Supervisor
- View all works, expenses, suppliers, contracts, cashboxes
- Can mark schedule stages as completed
- Cannot modify accounting or tax settings
- Cannot modify roles

### Administration
- Can validate expenses
- Can approve/reject suppliers
- Can manage contracts
- Can close months
- Can generate reports
- Cannot reopen closed months (Direction only)

### Operator
- Can create expenses
- Can create provisional suppliers
- Can manage own cashbox
- Can only view own expenses and cashboxes
- Cannot validate expenses
- Cannot manage contracts or accounting

## Next Steps

After seeding:

1. **Test Login:** Try logging in with different users
2. **Test Permissions:** Verify role-based access control
3. **Explore Data:** Use the API or Swagger UI to explore seeded data
4. **Create More Data:** Add more works, suppliers, etc. through the API

## Support

For issues or questions:
- Check the main README.md
- Review the API documentation at `/api/docs`
- Check the test files for usage examples


