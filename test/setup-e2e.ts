/**
 * E2E Test Setup
 * This file runs before all integration tests
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.test file if it exists
const envTestPath = path.join(__dirname, '..', '.env.test');
dotenv.config({ path: envTestPath });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';
process.env.DB_PORT = process.env.TEST_DB_PORT || '5432';
process.env.DB_USERNAME = process.env.TEST_DB_USERNAME || 'postgres';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'postgres';
process.env.DB_DATABASE = process.env.TEST_DB_DATABASE || 'pmd_management_test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';


