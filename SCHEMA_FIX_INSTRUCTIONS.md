# Manual Schema Fix Instructions

## Context
- Migrations are disabled by design
- Schema drift detected via production logs
- Need to align PostgreSQL schema with current TypeORM entities

## Required Changes

Three columns need to be added to the production database:

1. `accounting_records.income_id` (uuid, nullable)
2. `contracts.status` (varchar(50), nullable)
3. `works.work_type` (varchar(50), nullable)

## Execution Steps

### Option 1: Using DBeaver

1. Connect to production database in DBeaver
2. Open SQL Editor
3. Copy and paste the contents of `scripts/manual-schema-fix.sql`
4. Execute the script (F5 or Execute button)
5. Verify using the verification queries at the bottom of the script

### Option 2: Using psql

```bash
# Connect to production database
psql -h <host> -U <user> -d <database>

# Execute the SQL file
\i scripts/manual-schema-fix.sql

# Or execute statements directly:
ALTER TABLE accounting_records ADD COLUMN IF NOT EXISTS income_id uuid;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS status varchar(50);
ALTER TABLE works ADD COLUMN IF NOT EXISTS work_type varchar(50);
```

## SQL Statements (in order)

```sql
-- 1) accounting_records.income_id
ALTER TABLE accounting_records
ADD COLUMN IF NOT EXISTS income_id uuid;

-- 2) contracts.status
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS status varchar(50);

-- 3) works.work_type
ALTER TABLE works
ADD COLUMN IF NOT EXISTS work_type varchar(50);
```

## Verification

After executing the SQL statements, verify the columns exist:

```sql
-- Check accounting_records
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'accounting_records' AND column_name = 'income_id';

-- Check contracts
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'contracts' AND column_name = 'status';

-- Check works
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'works' AND column_name = 'work_type';
```

## After Schema Fix

1. **Redeploy backend** (if needed, or wait for auto-deploy)
2. **Verify endpoints:**
   - `GET /api/works` - should return works with work_type field
   - `GET /api/contracts` - should return contracts with status field
   - `GET /api/accounting` - should return accounting records with income_id field

## Safety Notes

- ✅ All columns are nullable (no data loss)
- ✅ `IF NOT EXISTS` prevents errors if columns already exist
- ✅ No foreign key constraints (TypeORM handles relationships)
- ✅ No indexes added (can be added later if needed)
- ✅ No data migration required (all values start as NULL)

## Rollback (if needed)

If you need to remove these columns (not recommended after deployment):

```sql
ALTER TABLE accounting_records DROP COLUMN IF EXISTS income_id;
ALTER TABLE contracts DROP COLUMN IF EXISTS status;
ALTER TABLE works DROP COLUMN IF EXISTS work_type;
```
