# Schema Audit Report

## Overview

Generated: 2026-01-09T15:27:13.848Z

Total Entities: 23

## Table: users

Total Columns: 10

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| email | varchar(255) | NO | - |
| password | varchar(255) | NO | - |
| fullName | varchar(255) | NO | - |
| phone | varchar(255) | YES | - |
| isActive | boolean | NO | true |
| role_id | uuid | YES | - |
| organization_id | uuid | YES | - |
| created_at | timestamp | NO | - |
| updated_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for users
SELECT 
    'users' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('id', 'email', 'password', 'fullName', 'phone', 'isActive', 'role_id', 'organization_id', 'created_at', 'updated_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
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
```

---

## Table: roles

Total Columns: 6

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| name | user_role_enum | NO | - |
| description | text | YES | - |
| permissions | jsonb | YES | - |
| created_at | timestamp | NO | - |
| updated_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for roles
SELECT 
    'roles' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'roles'
  AND column_name IN ('id', 'name', 'description', 'permissions', 'created_at', 'updated_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
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
```

---

## Table: organizations

Total Columns: 5

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| name | varchar(255) | NO | - |
| description | text | YES | - |
| created_at | timestamp | NO | - |
| updated_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for organizations
SELECT 
    'organizations' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'organizations'
  AND column_name IN ('id', 'name', 'description', 'created_at', 'updated_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS name varchar(255) NULL;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS description text NULL;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS created_at timestamp NULL;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS updated_at timestamp NULL;
```

---

## Table: works

Total Columns: 22

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| name | varchar(255) | NO | - |
| client | varchar(255) | NO | - |
| address | text | NO | - |
| start_date | date | NO | - |
| end_date | date | YES | - |
| status | work_status_enum | NO | - |
| currency | currency_enum | NO | - |
| work_type | work_type_enum | YES | - |
| supervisor_id | uuid | YES | - |
| organization_id | uuid | YES | - |
| total_budget | decimal(15,2) | NO | - |
| total_expenses | decimal(15,2) | NO | - |
| total_incomes | decimal(15,2) | NO | - |
| physical_progress | decimal(5,2) | NO | - |
| economic_progress | decimal(5,2) | NO | - |
| financial_progress | decimal(5,2) | NO | - |
| allow_post_closure_expenses | boolean | NO | - |
| post_closure_enabled_by_id | uuid | YES | - |
| post_closure_enabled_at | timestamp | YES | - |
| created_at | timestamp | NO | - |
| updated_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for works
SELECT 
    'works' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'works'
  AND column_name IN ('id', 'name', 'client', 'address', 'start_date', 'end_date', 'status', 'currency', 'work_type', 'supervisor_id', 'organization_id', 'total_budget', 'total_expenses', 'total_incomes', 'physical_progress', 'economic_progress', 'financial_progress', 'allow_post_closure_expenses', 'post_closure_enabled_by_id', 'post_closure_enabled_at', 'created_at', 'updated_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
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
```

---

## Table: contracts

Total Columns: 21

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| work_id | uuid | NO | - |
| supplier_id | uuid | NO | - |
| rubric_id | uuid | NO | - |
| amount_total | decimal(15,2) | NO | - |
| amount_executed | decimal(15,2) | NO | - |
| currency | currency_enum | NO | - |
| file_url | varchar(500) | YES | - |
| payment_terms | text | YES | - |
| is_blocked | boolean | NO | - |
| status | contract_status_enum | NO | - |
| observations | text | YES | - |
| validity_date | date | YES | - |
| scope | text | YES | - |
| specifications | text | YES | - |
| closed_by_id | uuid | YES | - |
| closed_at | timestamp | YES | - |
| start_date | date | YES | - |
| end_date | date | YES | - |
| created_at | timestamp | NO | - |
| updated_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for contracts
SELECT 
    'contracts' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'contracts'
  AND column_name IN ('id', 'work_id', 'supplier_id', 'rubric_id', 'amount_total', 'amount_executed', 'currency', 'file_url', 'payment_terms', 'is_blocked', 'status', 'observations', 'validity_date', 'scope', 'specifications', 'closed_by_id', 'closed_at', 'start_date', 'end_date', 'created_at', 'updated_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
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
```

---

## Table: expenses

Total Columns: 25

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| work_id | uuid | NO | - |
| supplier_id | uuid | YES | - |
| contract_id | uuid | YES | - |
| rubric_id | uuid | NO | - |
| amount | decimal(15,2) | NO | - |
| currency | currency_enum | NO | - |
| purchase_date | date | NO | - |
| document_type | document_type_enum | NO | - |
| document_number | varchar(100) | YES | - |
| state | expense_state_enum | NO | - |
| file_url | varchar(500) | YES | - |
| observations | text | YES | - |
| created_by_id | uuid | NO | - |
| validated_by_id | uuid | YES | - |
| validated_at | timestamp | YES | - |
| vat_amount | decimal(15,2) | YES | - |
| vat_rate | decimal(5,2) | YES | - |
| vat_perception | decimal(15,2) | YES | - |
| vat_withholding | decimal(15,2) | YES | - |
| iibb_perception | decimal(15,2) | YES | - |
| income_tax_withholding | decimal(15,2) | YES | - |
| is_post_closure | boolean | NO | - |
| created_at | timestamp | NO | - |
| updated_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for expenses
SELECT 
    'expenses' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'expenses'
  AND column_name IN ('id', 'work_id', 'supplier_id', 'contract_id', 'rubric_id', 'amount', 'currency', 'purchase_date', 'document_type', 'document_number', 'state', 'file_url', 'observations', 'created_by_id', 'validated_by_id', 'validated_at', 'vat_amount', 'vat_rate', 'vat_perception', 'vat_withholding', 'iibb_perception', 'income_tax_withholding', 'is_post_closure', 'created_at', 'updated_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
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
```

---

## Table: incomes

Total Columns: 15

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| work_id | uuid | NO | - |
| type | income_type_enum | NO | - |
| amount | decimal(15,2) | NO | - |
| currency | currency_enum | NO | - |
| date | date | NO | - |
| file_url | varchar(500) | YES | - |
| document_number | varchar(100) | YES | - |
| is_validated | boolean | NO | - |
| validated_by_id | uuid | YES | - |
| validated_at | timestamp | YES | - |
| observations | text | YES | - |
| payment_method | payment_method_enum | YES | - |
| created_at | timestamp | NO | - |
| updated_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for incomes
SELECT 
    'incomes' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'incomes'
  AND column_name IN ('id', 'work_id', 'type', 'amount', 'currency', 'date', 'file_url', 'document_number', 'is_validated', 'validated_by_id', 'validated_at', 'observations', 'payment_method', 'created_at', 'updated_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
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
```

---

## Table: accounting_records

Total Columns: 24

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| accounting_type | accounting_type_enum | NO | - |
| expense_id | uuid | YES | - |
| income_id | uuid | YES | - |
| work_id | uuid | YES | - |
| supplier_id | uuid | YES | - |
| organization_id | uuid | YES | - |
| date | date | NO | - |
| month | integer | NO | - |
| year | integer | NO | - |
| month_status | month_status_enum | NO | - |
| document_number | varchar(100) | YES | - |
| description | varchar(255) | YES | - |
| amount | decimal(15,2) | NO | - |
| currency | currency_enum | NO | - |
| vat_amount | decimal(15,2) | YES | - |
| vat_rate | decimal(5,2) | YES | - |
| vat_perception | decimal(15,2) | YES | - |
| vat_withholding | decimal(15,2) | YES | - |
| iibb_perception | decimal(15,2) | YES | - |
| income_tax_withholding | decimal(15,2) | YES | - |
| file_url | varchar(500) | YES | - |
| created_at | timestamp | NO | - |
| updated_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for accounting_records
SELECT 
    'accounting_records' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'accounting_records'
  AND column_name IN ('id', 'accounting_type', 'expense_id', 'income_id', 'work_id', 'supplier_id', 'organization_id', 'date', 'month', 'year', 'month_status', 'document_number', 'description', 'amount', 'currency', 'vat_amount', 'vat_rate', 'vat_perception', 'vat_withholding', 'iibb_perception', 'income_tax_withholding', 'file_url', 'created_at', 'updated_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
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
```

---

## Table: suppliers

Total Columns: 14

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| name | varchar(255) | NO | - |
| cuit | varchar(50) | YES | - |
| email | varchar(255) | YES | - |
| phone | varchar(50) | YES | - |
| category | varchar(255) | YES | - |
| status | supplier_status_enum | NO | - |
| type | supplier_type_enum | YES | - |
| fiscal_condition | fiscal_condition_enum | YES | - |
| address | text | YES | - |
| created_by_id | uuid | YES | - |
| organization_id | uuid | YES | - |
| created_at | timestamp | NO | - |
| updated_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for suppliers
SELECT 
    'suppliers' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'suppliers'
  AND column_name IN ('id', 'name', 'cuit', 'email', 'phone', 'category', 'status', 'type', 'fiscal_condition', 'address', 'created_by_id', 'organization_id', 'created_at', 'updated_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
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
```

---

## Table: rubrics

Total Columns: 7

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| name | varchar(255) | NO | - |
| description | text | YES | - |
| code | varchar(50) | YES | - |
| is_active | boolean | NO | true |
| created_at | timestamp | NO | - |
| updated_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for rubrics
SELECT 
    'rubrics' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'rubrics'
  AND column_name IN ('id', 'name', 'description', 'code', 'is_active', 'created_at', 'updated_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
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
```

---

## Table: cashboxes

Total Columns: 16

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| user_id | uuid | NO | - |
| status | cashbox_status_enum | NO | - |
| opening_balance_ars | decimal(15,2) | NO | - |
| opening_balance_usd | decimal(15,2) | NO | - |
| closing_balance_ars | decimal(15,2) | NO | - |
| closing_balance_usd | decimal(15,2) | NO | - |
| difference_ars | decimal(15,2) | NO | - |
| difference_usd | decimal(15,2) | NO | - |
| difference_approved | boolean | NO | - |
| difference_approved_by_id | uuid | YES | - |
| difference_approved_at | timestamp | YES | - |
| opening_date | date | NO | - |
| closing_date | date | YES | - |
| created_at | timestamp | NO | - |
| updated_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for cashboxes
SELECT 
    'cashboxes' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'cashboxes'
  AND column_name IN ('id', 'user_id', 'status', 'opening_balance_ars', 'opening_balance_usd', 'closing_balance_ars', 'closing_balance_usd', 'difference_ars', 'difference_usd', 'difference_approved', 'difference_approved_by_id', 'difference_approved_at', 'opening_date', 'closing_date', 'created_at', 'updated_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
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
```

---

## Table: cash_movements

Total Columns: 11

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| cashbox_id | uuid | NO | - |
| type | cash_movement_type_enum | NO | - |
| amount | decimal(15,2) | NO | - |
| currency | currency_enum | NO | - |
| description | text | YES | - |
| expense_id | uuid | YES | - |
| income_id | uuid | YES | - |
| date | date | NO | - |
| created_at | timestamp | NO | - |
| updated_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for cash_movements
SELECT 
    'cash_movements' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'cash_movements'
  AND column_name IN ('id', 'cashbox_id', 'type', 'amount', 'currency', 'description', 'expense_id', 'income_id', 'date', 'created_at', 'updated_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
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
```

---

## Table: work_schedule

Total Columns: 11

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| work_id | uuid | NO | - |
| stage_name | varchar(255) | NO | - |
| start_date | date | NO | - |
| end_date | date | NO | - |
| actual_end_date | date | YES | - |
| state | schedule_state_enum | NO | - |
| order | integer | YES | - |
| description | text | YES | - |
| created_at | timestamp | NO | - |
| updated_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for work_schedule
SELECT 
    'work_schedule' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'work_schedule'
  AND column_name IN ('id', 'work_id', 'stage_name', 'start_date', 'end_date', 'actual_end_date', 'state', 'order', 'description', 'created_at', 'updated_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
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
```

---

## Table: alerts

Total Columns: 20

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| type | alert_type_enum | NO | - |
| severity | alert_severity_enum | NO | - |
| title | varchar(255) | NO | - |
| message | text | NO | - |
| is_read | boolean | NO | - |
| status | alert_status_enum | NO | - |
| user_id | uuid | YES | - |
| assigned_to_id | uuid | YES | - |
| resolved_by_id | uuid | YES | - |
| resolved_at | timestamp | YES | - |
| work_id | uuid | YES | - |
| supplier_id | uuid | YES | - |
| expense_id | uuid | YES | - |
| contract_id | uuid | YES | - |
| cashbox_id | uuid | YES | - |
| document_id | uuid | YES | - |
| metadata | jsonb | YES | - |
| created_at | timestamp | NO | - |
| updated_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for alerts
SELECT 
    'alerts' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'alerts'
  AND column_name IN ('id', 'type', 'severity', 'title', 'message', 'is_read', 'status', 'user_id', 'assigned_to_id', 'resolved_by_id', 'resolved_at', 'work_id', 'supplier_id', 'expense_id', 'contract_id', 'cashbox_id', 'document_id', 'metadata', 'created_at', 'updated_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
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
```

---

## Table: audit_log

Total Columns: 13

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| user_id | uuid | YES | - |
| action | varchar(100) | NO | - |
| module | varchar(100) | NO | - |
| entity_id | uuid | YES | - |
| entity_type | varchar(100) | YES | - |
| previous_value | jsonb | YES | - |
| new_value | jsonb | YES | - |
| ip_address | varchar(50) | YES | - |
| user_agent | varchar(500) | YES | - |
| device_info | jsonb | YES | - |
| criticality | varchar(50) | YES | - |
| created_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for audit_log
SELECT 
    'audit_log' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'audit_log'
  AND column_name IN ('id', 'user_id', 'action', 'module', 'entity_id', 'entity_type', 'previous_value', 'new_value', 'ip_address', 'user_agent', 'device_info', 'criticality', 'created_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
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
```

---

## Table: val

Total Columns: 6

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| code | varchar(50) | NO | - |
| expense_id | uuid | NO | - |
| file_url | varchar(500) | YES | - |
| created_at | timestamp | NO | - |
| updated_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for val
SELECT 
    'val' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'val'
  AND column_name IN ('id', 'code', 'expense_id', 'file_url', 'created_at', 'updated_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
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
```

---

## Table: work_budgets

Total Columns: 9

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| work_id | uuid | NO | - |
| type | budget_type_enum | NO | - |
| amount | decimal(15,2) | NO | - |
| description | varchar(500) | YES | - |
| date | date | NO | - |
| file_url | varchar(500) | YES | - |
| created_at | timestamp | NO | - |
| updated_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for work_budgets
SELECT 
    'work_budgets' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'work_budgets'
  AND column_name IN ('id', 'work_id', 'type', 'amount', 'description', 'date', 'file_url', 'created_at', 'updated_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
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
```

---

## Table: work_documents

Total Columns: 11

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| work_id | uuid | NO | - |
| file_url | varchar(500) | NO | - |
| name | varchar(255) | YES | - |
| type | work_document_type_enum | NO | - |
| status | work_document_status_enum | NO | - |
| version | varchar(50) | YES | - |
| notes | text | YES | - |
| created_by_id | uuid | YES | - |
| created_at | timestamp | NO | - |
| updated_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for work_documents
SELECT 
    'work_documents' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'work_documents'
  AND column_name IN ('id', 'work_id', 'file_url', 'name', 'type', 'status', 'version', 'notes', 'created_by_id', 'created_at', 'updated_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
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
```

---

## Table: work_users

Total Columns: 5

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| work_id | uuid | NO | - |
| user_id | uuid | NO | - |
| role | varchar(255) | YES | - |
| assigned_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for work_users
SELECT 
    'work_users' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'work_users'
  AND column_name IN ('id', 'work_id', 'user_id', 'role', 'assigned_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
ALTER TABLE work_users
  ADD COLUMN IF NOT EXISTS work_id uuid NULL;

ALTER TABLE work_users
  ADD COLUMN IF NOT EXISTS user_id uuid NULL;

ALTER TABLE work_users
  ADD COLUMN IF NOT EXISTS role varchar(255) NULL;

ALTER TABLE work_users
  ADD COLUMN IF NOT EXISTS assigned_at timestamp NULL;
```

---

## Table: supplier_documents

Total Columns: 11

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| supplier_id | uuid | NO | - |
| document_type | supplier_document_type_enum | NO | - |
| file_url | varchar(500) | YES | - |
| document_number | varchar(255) | YES | - |
| expiration_date | date | YES | - |
| is_valid | boolean | NO | true |
| version | varchar(50) | YES | - |
| notes | text | YES | - |
| created_at | timestamp | NO | - |
| updated_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for supplier_documents
SELECT 
    'supplier_documents' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'supplier_documents'
  AND column_name IN ('id', 'supplier_id', 'document_type', 'file_url', 'document_number', 'expiration_date', 'is_valid', 'version', 'notes', 'created_at', 'updated_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
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
```

---

## Table: exchange_rates

Total Columns: 6

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| date | date | NO | - |
| rate_ars_to_usd | decimal(10,4) | NO | - |
| rate_usd_to_ars | decimal(10,4) | NO | - |
| created_by_id | uuid | NO | - |
| created_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for exchange_rates
SELECT 
    'exchange_rates' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'exchange_rates'
  AND column_name IN ('id', 'date', 'rate_ars_to_usd', 'rate_usd_to_ars', 'created_by_id', 'created_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
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
```

---

## Table: backups

Total Columns: 11

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| type | backup_type_enum | NO | - |
| status | backup_status_enum | NO | - |
| file_path | varchar(500) | NO | - |
| storage_url | varchar(500) | YES | - |
| file_size | bigint | NO | - |
| error_message | text | YES | - |
| created_by_id | uuid | YES | - |
| started_at | timestamp | YES | - |
| completed_at | timestamp | YES | - |
| created_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for backups
SELECT 
    'backups' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'backups'
  AND column_name IN ('id', 'type', 'status', 'file_path', 'storage_url', 'file_size', 'error_message', 'created_by_id', 'started_at', 'completed_at', 'created_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
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
```

---

## Table: offline_items

Total Columns: 8

### Columns:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|----------|
| id | uuid | NO | - |
| item_type | varchar(100) | NO | - |
| data | jsonb | NO | - |
| user_id | uuid | NO | - |
| is_synced | boolean | NO | - |
| synced_at | timestamp | YES | - |
| error_message | text | YES | - |
| created_at | timestamp | NO | - |

### SQL Check Query:

```sql

-- Check missing columns for offline_items
SELECT 
    'offline_items' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'offline_items'
  AND column_name IN ('id', 'item_type', 'data', 'user_id', 'is_synced', 'synced_at', 'error_message', 'created_at')
ORDER BY column_name;
```

### ALTER TABLE Statements:

```sql
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
```

---

