-- ============================================================================
-- Schema Alignment SQL Script
-- ============================================================================
-- Purpose: Add missing columns to align PostgreSQL schema with TypeORM entities
-- Generated: 2026-01-09T15:27:13.851Z
-- 
-- IMPORTANT: 
-- - Execute this script manually against production database (DBeaver or psql)
-- - All columns are added with IF NOT EXISTS (safe to run multiple times)
-- - Columns are nullable by default to prevent data loss
-- - No foreign key constraints are added (TypeORM handles relationships)
-- - Enum types must exist in database (created by migrations)
-- - If enum types don't exist, replace enum type with varchar(50) temporarily
-- 
-- PREREQUISITES:
-- - All enum types must be created (run migrations first if needed)
-- - Database must have uuid extension enabled
-- 
-- VERIFICATION:
-- After execution, run the verification query at the bottom of this file
-- ============================================================================

-- ============================================================================
-- Table: users
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email varchar(255) NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password varchar(255) NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS fullName varchar(255) NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone varchar(255) NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS isActive boolean DEFAULT true;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role_id uuid NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS organization_id uuid NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS updated_at timestamp NULL;

-- ============================================================================
-- Table: roles
-- ============================================================================

ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS name user_role_enum NULL;

ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS description text NULL;

ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS permissions jsonb NULL;

ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS updated_at timestamp NULL;

-- ============================================================================
-- Table: organizations
-- ============================================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS name varchar(255) NULL;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS description text NULL;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS updated_at timestamp NULL;

-- ============================================================================
-- Table: works
-- ============================================================================

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS name varchar(255) NULL;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS client varchar(255) NULL;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS address text NULL;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS start_date date NULL;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS end_date date NULL;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS status work_status_enum NULL;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS currency currency_enum NULL;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS work_type work_type_enum NULL;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS supervisor_id uuid NULL;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS organization_id uuid NULL;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS total_budget decimal(15,2) NULL DEFAULT 0;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS total_expenses decimal(15,2) NULL DEFAULT 0;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS total_incomes decimal(15,2) NULL DEFAULT 0;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS physical_progress decimal(5,2) NULL DEFAULT 0;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS economic_progress decimal(5,2) NULL DEFAULT 0;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS financial_progress decimal(5,2) NULL DEFAULT 0;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS allow_post_closure_expenses boolean NULL DEFAULT false;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS post_closure_enabled_by_id uuid NULL;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS post_closure_enabled_at timestamp NULL;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS updated_at timestamp NULL;

-- ============================================================================
-- Table: contracts
-- ============================================================================

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS work_id uuid NULL;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS supplier_id uuid NULL;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS rubric_id uuid NULL;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS amount_total decimal(15,2) NULL;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS amount_executed decimal(15,2) NULL DEFAULT 0;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS currency currency_enum NULL;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS file_url varchar(500) NULL;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS payment_terms text NULL;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS is_blocked boolean NULL DEFAULT false;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS status contract_status_enum NULL;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS observations text NULL;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS validity_date date NULL;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS scope text NULL;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS specifications text NULL;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS closed_by_id uuid NULL;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS closed_at timestamp NULL;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS start_date date NULL;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS end_date date NULL;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS updated_at timestamp NULL;

-- ============================================================================
-- Table: expenses
-- ============================================================================

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS work_id uuid NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS supplier_id uuid NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS contract_id uuid NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS rubric_id uuid NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS amount decimal(15,2) NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS currency currency_enum NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS purchase_date date NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS document_type document_type_enum NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS document_number varchar(100) NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS state expense_state_enum NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS file_url varchar(500) NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS observations text NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS created_by_id uuid NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS validated_by_id uuid NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS validated_at timestamp NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS vat_amount decimal(15,2) NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS vat_rate decimal(5,2) NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS vat_perception decimal(15,2) NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS vat_withholding decimal(15,2) NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS iibb_perception decimal(15,2) NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS income_tax_withholding decimal(15,2) NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS is_post_closure boolean NULL DEFAULT false;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS updated_at timestamp NULL;

-- ============================================================================
-- Table: incomes
-- ============================================================================

ALTER TABLE incomes
  ADD COLUMN IF NOT EXISTS work_id uuid NULL;

ALTER TABLE incomes
  ADD COLUMN IF NOT EXISTS type income_type_enum NULL;

ALTER TABLE incomes
  ADD COLUMN IF NOT EXISTS amount decimal(15,2) NULL;

ALTER TABLE incomes
  ADD COLUMN IF NOT EXISTS currency currency_enum NULL;

ALTER TABLE incomes
  ADD COLUMN IF NOT EXISTS date date NULL;

ALTER TABLE incomes
  ADD COLUMN IF NOT EXISTS file_url varchar(500) NULL;

ALTER TABLE incomes
  ADD COLUMN IF NOT EXISTS document_number varchar(100) NULL;

ALTER TABLE incomes
  ADD COLUMN IF NOT EXISTS is_validated boolean NULL DEFAULT false;

ALTER TABLE incomes
  ADD COLUMN IF NOT EXISTS validated_by_id uuid NULL;

ALTER TABLE incomes
  ADD COLUMN IF NOT EXISTS validated_at timestamp NULL;

ALTER TABLE incomes
  ADD COLUMN IF NOT EXISTS observations text NULL;

ALTER TABLE incomes
  ADD COLUMN IF NOT EXISTS payment_method payment_method_enum NULL;

ALTER TABLE incomes
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

ALTER TABLE incomes
  ADD COLUMN IF NOT EXISTS updated_at timestamp NULL;

-- ============================================================================
-- Table: accounting_records
-- ============================================================================

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS accounting_type accounting_type_enum NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS expense_id uuid NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS income_id uuid NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS work_id uuid NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS supplier_id uuid NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS organization_id uuid NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS date date NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS month integer NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS year integer NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS month_status month_status_enum NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS document_number varchar(100) NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS description varchar(255) NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS amount decimal(15,2) NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS currency currency_enum NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS vat_amount decimal(15,2) NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS vat_rate decimal(5,2) NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS vat_perception decimal(15,2) NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS vat_withholding decimal(15,2) NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS iibb_perception decimal(15,2) NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS income_tax_withholding decimal(15,2) NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS file_url varchar(500) NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

ALTER TABLE accounting_records
  ADD COLUMN IF NOT EXISTS updated_at timestamp NULL;

-- ============================================================================
-- Table: suppliers
-- ============================================================================

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS name varchar(255) NULL;

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS cuit varchar(50) NULL;

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS email varchar(255) NULL;

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS phone varchar(50) NULL;

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS category varchar(255) NULL;

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS status supplier_status_enum NULL;

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS type supplier_type_enum NULL;

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS fiscal_condition fiscal_condition_enum NULL;

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS address text NULL;

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS created_by_id uuid NULL;

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS organization_id uuid NULL;

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS updated_at timestamp NULL;

-- ============================================================================
-- Table: rubrics
-- ============================================================================

ALTER TABLE rubrics
  ADD COLUMN IF NOT EXISTS name varchar(255) NULL;

ALTER TABLE rubrics
  ADD COLUMN IF NOT EXISTS description text NULL;

ALTER TABLE rubrics
  ADD COLUMN IF NOT EXISTS code varchar(50) NULL;

ALTER TABLE rubrics
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

ALTER TABLE rubrics
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

ALTER TABLE rubrics
  ADD COLUMN IF NOT EXISTS updated_at timestamp NULL;

-- ============================================================================
-- Table: cashboxes
-- ============================================================================

ALTER TABLE cashboxes
  ADD COLUMN IF NOT EXISTS user_id uuid NULL;

ALTER TABLE cashboxes
  ADD COLUMN IF NOT EXISTS status cashbox_status_enum NULL;

ALTER TABLE cashboxes
  ADD COLUMN IF NOT EXISTS opening_balance_ars decimal(15,2) NULL DEFAULT 0;

ALTER TABLE cashboxes
  ADD COLUMN IF NOT EXISTS opening_balance_usd decimal(15,2) NULL DEFAULT 0;

ALTER TABLE cashboxes
  ADD COLUMN IF NOT EXISTS closing_balance_ars decimal(15,2) NULL DEFAULT 0;

ALTER TABLE cashboxes
  ADD COLUMN IF NOT EXISTS closing_balance_usd decimal(15,2) NULL DEFAULT 0;

ALTER TABLE cashboxes
  ADD COLUMN IF NOT EXISTS difference_ars decimal(15,2) NULL DEFAULT 0;

ALTER TABLE cashboxes
  ADD COLUMN IF NOT EXISTS difference_usd decimal(15,2) NULL DEFAULT 0;

ALTER TABLE cashboxes
  ADD COLUMN IF NOT EXISTS difference_approved boolean NULL DEFAULT false;

ALTER TABLE cashboxes
  ADD COLUMN IF NOT EXISTS difference_approved_by_id uuid NULL;

ALTER TABLE cashboxes
  ADD COLUMN IF NOT EXISTS difference_approved_at timestamp NULL;

ALTER TABLE cashboxes
  ADD COLUMN IF NOT EXISTS opening_date date NULL;

ALTER TABLE cashboxes
  ADD COLUMN IF NOT EXISTS closing_date date NULL;

ALTER TABLE cashboxes
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

ALTER TABLE cashboxes
  ADD COLUMN IF NOT EXISTS updated_at timestamp NULL;

-- ============================================================================
-- Table: cash_movements
-- ============================================================================

ALTER TABLE cash_movements
  ADD COLUMN IF NOT EXISTS cashbox_id uuid NULL;

ALTER TABLE cash_movements
  ADD COLUMN IF NOT EXISTS type cash_movement_type_enum NULL;

ALTER TABLE cash_movements
  ADD COLUMN IF NOT EXISTS amount decimal(15,2) NULL;

ALTER TABLE cash_movements
  ADD COLUMN IF NOT EXISTS currency currency_enum NULL;

ALTER TABLE cash_movements
  ADD COLUMN IF NOT EXISTS description text NULL;

ALTER TABLE cash_movements
  ADD COLUMN IF NOT EXISTS expense_id uuid NULL;

ALTER TABLE cash_movements
  ADD COLUMN IF NOT EXISTS income_id uuid NULL;

ALTER TABLE cash_movements
  ADD COLUMN IF NOT EXISTS date date NULL;

ALTER TABLE cash_movements
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

ALTER TABLE cash_movements
  ADD COLUMN IF NOT EXISTS updated_at timestamp NULL;

-- ============================================================================
-- Table: work_schedule
-- ============================================================================

ALTER TABLE work_schedule
  ADD COLUMN IF NOT EXISTS work_id uuid NULL;

ALTER TABLE work_schedule
  ADD COLUMN IF NOT EXISTS stage_name varchar(255) NULL;

ALTER TABLE work_schedule
  ADD COLUMN IF NOT EXISTS start_date date NULL;

ALTER TABLE work_schedule
  ADD COLUMN IF NOT EXISTS end_date date NULL;

ALTER TABLE work_schedule
  ADD COLUMN IF NOT EXISTS actual_end_date date NULL;

ALTER TABLE work_schedule
  ADD COLUMN IF NOT EXISTS state schedule_state_enum NULL;

ALTER TABLE work_schedule
  ADD COLUMN IF NOT EXISTS order integer NULL;

ALTER TABLE work_schedule
  ADD COLUMN IF NOT EXISTS description text NULL;

ALTER TABLE work_schedule
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

ALTER TABLE work_schedule
  ADD COLUMN IF NOT EXISTS updated_at timestamp NULL;

-- ============================================================================
-- Table: alerts
-- ============================================================================

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS type alert_type_enum NULL;

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS severity alert_severity_enum NULL;

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS title varchar(255) NULL;

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS message text NULL;

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS is_read boolean NULL DEFAULT false;

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS status alert_status_enum NULL;

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS user_id uuid NULL;

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS assigned_to_id uuid NULL;

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS resolved_by_id uuid NULL;

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS resolved_at timestamp NULL;

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS work_id uuid NULL;

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS supplier_id uuid NULL;

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS expense_id uuid NULL;

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS contract_id uuid NULL;

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS cashbox_id uuid NULL;

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS document_id uuid NULL;

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS metadata jsonb NULL;

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS updated_at timestamp NULL;

-- ============================================================================
-- Table: audit_log
-- ============================================================================

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS user_id uuid NULL;

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS action varchar(100) NULL;

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS module varchar(100) NULL;

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS entity_id uuid NULL;

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS entity_type varchar(100) NULL;

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS previous_value jsonb NULL;

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS new_value jsonb NULL;

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS ip_address varchar(50) NULL;

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS user_agent varchar(500) NULL;

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS device_info jsonb NULL;

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS criticality varchar(50) NULL;

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

-- ============================================================================
-- Table: val
-- ============================================================================

ALTER TABLE val
  ADD COLUMN IF NOT EXISTS code varchar(50) NULL;

ALTER TABLE val
  ADD COLUMN IF NOT EXISTS expense_id uuid NULL;

ALTER TABLE val
  ADD COLUMN IF NOT EXISTS file_url varchar(500) NULL;

ALTER TABLE val
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

ALTER TABLE val
  ADD COLUMN IF NOT EXISTS updated_at timestamp NULL;

-- ============================================================================
-- Table: work_budgets
-- ============================================================================

ALTER TABLE work_budgets
  ADD COLUMN IF NOT EXISTS work_id uuid NULL;

ALTER TABLE work_budgets
  ADD COLUMN IF NOT EXISTS type budget_type_enum NULL;

ALTER TABLE work_budgets
  ADD COLUMN IF NOT EXISTS amount decimal(15,2) NULL;

ALTER TABLE work_budgets
  ADD COLUMN IF NOT EXISTS description varchar(500) NULL;

ALTER TABLE work_budgets
  ADD COLUMN IF NOT EXISTS date date NULL;

ALTER TABLE work_budgets
  ADD COLUMN IF NOT EXISTS file_url varchar(500) NULL;

ALTER TABLE work_budgets
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

ALTER TABLE work_budgets
  ADD COLUMN IF NOT EXISTS updated_at timestamp NULL;

-- ============================================================================
-- Table: work_documents
-- ============================================================================

ALTER TABLE work_documents
  ADD COLUMN IF NOT EXISTS work_id uuid NULL;

ALTER TABLE work_documents
  ADD COLUMN IF NOT EXISTS file_url varchar(500) NULL;

ALTER TABLE work_documents
  ADD COLUMN IF NOT EXISTS name varchar(255) NULL;

ALTER TABLE work_documents
  ADD COLUMN IF NOT EXISTS type work_document_type_enum NULL;

ALTER TABLE work_documents
  ADD COLUMN IF NOT EXISTS status work_document_status_enum NULL;

ALTER TABLE work_documents
  ADD COLUMN IF NOT EXISTS version varchar(50) NULL;

ALTER TABLE work_documents
  ADD COLUMN IF NOT EXISTS notes text NULL;

ALTER TABLE work_documents
  ADD COLUMN IF NOT EXISTS created_by_id uuid NULL;

ALTER TABLE work_documents
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

ALTER TABLE work_documents
  ADD COLUMN IF NOT EXISTS updated_at timestamp NULL;

-- ============================================================================
-- Table: work_users
-- ============================================================================

ALTER TABLE work_users
  ADD COLUMN IF NOT EXISTS work_id uuid NULL;

ALTER TABLE work_users
  ADD COLUMN IF NOT EXISTS user_id uuid NULL;

ALTER TABLE work_users
  ADD COLUMN IF NOT EXISTS role varchar(255) NULL;

ALTER TABLE work_users
  ADD COLUMN IF NOT EXISTS assigned_at timestamp NULL;

-- ============================================================================
-- Table: supplier_documents
-- ============================================================================

ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS supplier_id uuid NULL;

ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS document_type supplier_document_type_enum NULL;

ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS file_url varchar(500) NULL;

ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS document_number varchar(255) NULL;

ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS expiration_date date NULL;

ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS is_valid boolean DEFAULT true;

ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS version varchar(50) NULL;

ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS notes text NULL;

ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

ALTER TABLE supplier_documents
  ADD COLUMN IF NOT EXISTS updated_at timestamp NULL;

-- ============================================================================
-- Table: exchange_rates
-- ============================================================================

ALTER TABLE exchange_rates
  ADD COLUMN IF NOT EXISTS date date NULL;

ALTER TABLE exchange_rates
  ADD COLUMN IF NOT EXISTS rate_ars_to_usd decimal(10,4) NULL;

ALTER TABLE exchange_rates
  ADD COLUMN IF NOT EXISTS rate_usd_to_ars decimal(10,4) NULL;

ALTER TABLE exchange_rates
  ADD COLUMN IF NOT EXISTS created_by_id uuid NULL;

ALTER TABLE exchange_rates
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

-- ============================================================================
-- Table: backups
-- ============================================================================

ALTER TABLE backups
  ADD COLUMN IF NOT EXISTS type backup_type_enum NULL;

ALTER TABLE backups
  ADD COLUMN IF NOT EXISTS status backup_status_enum NULL;

ALTER TABLE backups
  ADD COLUMN IF NOT EXISTS file_path varchar(500) NULL;

ALTER TABLE backups
  ADD COLUMN IF NOT EXISTS storage_url varchar(500) NULL;

ALTER TABLE backups
  ADD COLUMN IF NOT EXISTS file_size bigint NULL;

ALTER TABLE backups
  ADD COLUMN IF NOT EXISTS error_message text NULL;

ALTER TABLE backups
  ADD COLUMN IF NOT EXISTS created_by_id uuid NULL;

ALTER TABLE backups
  ADD COLUMN IF NOT EXISTS started_at timestamp NULL;

ALTER TABLE backups
  ADD COLUMN IF NOT EXISTS completed_at timestamp NULL;

ALTER TABLE backups
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

-- ============================================================================
-- Table: offline_items
-- ============================================================================

ALTER TABLE offline_items
  ADD COLUMN IF NOT EXISTS item_type varchar(100) NULL;

ALTER TABLE offline_items
  ADD COLUMN IF NOT EXISTS data jsonb NULL;

ALTER TABLE offline_items
  ADD COLUMN IF NOT EXISTS user_id uuid NULL;

ALTER TABLE offline_items
  ADD COLUMN IF NOT EXISTS is_synced boolean NULL DEFAULT false;

ALTER TABLE offline_items
  ADD COLUMN IF NOT EXISTS synced_at timestamp NULL;

ALTER TABLE offline_items
  ADD COLUMN IF NOT EXISTS error_message text NULL;

ALTER TABLE offline_items
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Run this query to verify all columns exist:
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'users', 'roles', 'organizations', 'works', 'contracts', 'expenses',
    'incomes', 'accounting_records', 'suppliers', 'rubrics', 'cashboxes',
    'cash_movements', 'work_schedule', 'alerts', 'audit_log', 'val',
    'work_budgets', 'work_documents', 'work_users', 'supplier_documents',
    'exchange_rates', 'backups', 'offline_items'
  )
ORDER BY table_name, column_name;
