-- ============================================================================
-- Manual Schema Fix for Production Database
-- ============================================================================
-- Purpose: Align PostgreSQL schema with current TypeORM entities
-- Context: Migrations are disabled by design, schema drift detected
-- 
-- IMPORTANT: Execute these statements in order using DBeaver or psql
-- ============================================================================

-- ============================================================================
-- STEP 1: Add income_id column to accounting_records table
-- ============================================================================
-- This column links accounting records to income records
-- Type: uuid (nullable, no foreign key constraint for manual fix)
ALTER TABLE accounting_records
ADD COLUMN IF NOT EXISTS income_id uuid;

-- ============================================================================
-- STEP 2: Add status column to contracts table
-- ============================================================================
-- Option A: As varchar(50) - Simple approach, flexible
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS status varchar(50);

-- Option B: As enum (if contract_status_enum already exists in production)
-- Uncomment if enum type exists:
-- ALTER TABLE contracts
-- ADD COLUMN IF NOT EXISTS status contract_status_enum;

-- ============================================================================
-- STEP 3: Add work_type column to works table
-- ============================================================================
-- Option A: As varchar(50) - Simple approach, flexible
ALTER TABLE works
ADD COLUMN IF NOT EXISTS work_type varchar(50);

-- Option B: As enum (if work_type_enum already exists in production)
-- Uncomment if enum type exists:
-- ALTER TABLE works
-- ADD COLUMN IF NOT EXISTS work_type work_type_enum;

-- ============================================================================
-- Verification Queries (run after ALTER statements)
-- ============================================================================

-- Verify accounting_records.income_id
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'accounting_records' 
  AND column_name = 'income_id';

-- Verify contracts.status
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'contracts' 
  AND column_name = 'status';

-- Verify works.work_type
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'works' 
  AND column_name = 'work_type';

-- ============================================================================
-- Notes:
-- - All columns are nullable to prevent data loss
-- - No foreign key constraints added (TypeORM handles relationships)
-- - IF NOT EXISTS prevents errors if columns already exist
-- ============================================================================
