# Integration Tests - PMD Management System

## Overview

This directory contains comprehensive integration tests (E2E) for the PMD Management System. These tests verify complete business flows end-to-end, including database interactions, authentication, authorization, and business rule enforcement.

## Test Files

### Core Business Flows

1. **`cashbox-expense-accounting.e2e-spec.ts`**
   - Tests: Cashbox → Expense → Validation → Accounting flow
   - Covers: Expense creation, validation, accounting record generation, cash movements

2. **`income-work-dashboard.e2e-spec.ts`**
   - Tests: Income → Work Dashboard updates
   - Covers: Income registration, work totals updates, financial progress calculation

3. **`supplier-contract-expense.e2e-spec.ts`**
   - Tests: Supplier → Document → Contract → Expense flow
   - Covers: Provisional supplier creation, document upload, approval, contract creation, expense linking

4. **`contract-blocking-val.e2e-spec.ts`**
   - Tests: Contract auto-blocking and VAL auto-generation
   - Covers: Contract blocking when balance reaches zero, Direction override, VAL sequential generation

5. **`work-progress-alerts.e2e-spec.ts`**
   - Tests: Work progress → Supervisor completion → Alerts
   - Covers: Schedule stages, supervisor completion, overdue alerts

6. **`expired-art-blocking.e2e-spec.ts`**
   - Tests: Expired insurance blocking operator
   - Covers: ART expiration, supplier blocking, alert generation, operator restrictions

7. **`monthly-closure.e2e-spec.ts`**
   - Tests: Monthly closure and Direction override
   - Covers: Month closing, record restrictions, Direction override, month reopening

8. **`cashbox-closure-alerts.e2e-spec.ts`**
   - Tests: Cashbox closure → Alerts generation
   - Covers: Cashbox closing, difference calculation, alert generation for differences, difference approval by Direction, permission restrictions

9. **`multi-role-permissions.e2e-spec.ts`**
   - Tests: Multi-role permission verification
   - Covers: All roles (Direction, Supervisor, Administration, Operator) and their specific permissions

## Test Infrastructure

### Files

- **`test-helpers.ts`** - Test utilities, data builders, and helper functions
- **`test-database.module.ts`** - Test database configuration
- **`jest-e2e.json`** - Jest E2E configuration
- **`setup-e2e.ts`** - Test environment setup

## Running Tests

### Prerequisites

1. PostgreSQL test database must be running
2. Set environment variables (or use defaults):
   ```bash
   TEST_DB_HOST=localhost
   TEST_DB_PORT=5432
   TEST_DB_USERNAME=postgres
   TEST_DB_PASSWORD=postgres
   TEST_DB_DATABASE=pmd_management_test
   ```

### Run All Integration Tests

```bash
npm run test:e2e
```

### Run Specific Test File

```bash
npm run test:e2e -- cashbox-expense-accounting.e2e-spec.ts
```

### Run Tests in Watch Mode

```bash
npm run test:e2e -- --watch
```

## Test Data Builders

The `TestDataBuilder` class provides factory methods for creating test data:

- `createRole()` - Create roles
- `createUser()` - Create users with roles
- `createRubric()` - Create rubrics
- `createWork()` - Create works
- `createSupplier()` - Create suppliers
- `createSupplierDocument()` - Create supplier documents
- `createContract()` - Create contracts
- `createCashbox()` - Create cashboxes
- `loginUser()` - Login and get JWT token

## Test Coverage

### Business Flows Covered

✅ Cashbox → Expense → Validation → Accounting  
✅ Income → Work Dashboard  
✅ Supplier creation → Document upload → Contract → Expense  
✅ Contract without balance → Block expense  
✅ Work progress → Supervisor completion → Alerts  
✅ Expired insurance blocking operator  
✅ VAL auto-generation  
✅ Monthly closure  
✅ Multi-role permission tests  

### Error Scenarios Covered

✅ Invalid data  
✅ Expired ART  
✅ Insufficient permissions  
✅ Missing fields  
✅ Blocked supplier  
✅ Blocked contract  
✅ Closed month restrictions  

### Authorization Tests

✅ Direction - Full access, overrides  
✅ Supervisor - View all, complete stages  
✅ Administration - Validate, approve, close months  
✅ Operator - Own resources only, provisional suppliers  

## Test Structure

Each test file follows this structure:

```typescript
describe('Feature Name (e2e)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let dataBuilder: TestDataBuilder;
  let userTokens: { [key: string]: string };

  beforeAll(async () => {
    // Setup test app and create test data
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('Feature Flow', () => {
    it('should complete full flow', async () => {
      // Test implementation
    });
  });

  describe('Error Cases', () => {
    it('should handle errors', async () => {
      // Error scenario tests
    });
  });
});
```

## Best Practices

1. **Isolation**: Each test is independent
2. **Cleanup**: Database is cleaned between test runs
3. **Realistic Data**: Tests use realistic test data
4. **Full Flows**: Tests cover complete business processes
5. **Error Handling**: Both success and error paths are tested
6. **Authorization**: All role-based restrictions are verified

## Notes

- Tests use a separate test database
- Database schema is synchronized automatically for tests
- JWT tokens are generated for each test user
- All HTTP requests use supertest
- Tests verify both API responses and database state


