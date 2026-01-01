/**
 * Script to setup test database
 * Creates the test database if it doesn't exist
 */

import { Client } from 'pg';

async function setupTestDatabase() {
  const dbHost = process.env.TEST_DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.TEST_DB_PORT || '5432', 10);
  const dbUsername = process.env.TEST_DB_USERNAME || 'postgres';
  const dbPassword = process.env.TEST_DB_PASSWORD || 'postgres';
  const dbName = process.env.TEST_DB_DATABASE || 'pmd_management_test';

  console.log('🔧 Test Database Setup');
  console.log(`   Host: ${dbHost}`);
  console.log(`   Port: ${dbPort}`);
  console.log(`   Username: ${dbUsername}`);
  console.log(`   Database: ${dbName}`);
  console.log('');

  // Connect to PostgreSQL server (not to a specific database)
  const adminClient = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUsername,
    password: dbPassword,
    database: 'postgres', // Connect to default postgres database
  });

  try {
    await adminClient.connect();
    console.log('✅ Connected to PostgreSQL server');

    // Check if database exists
    const result = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (result.rows.length === 0) {
      // Database doesn't exist, create it
      console.log(`📦 Creating test database: ${dbName}`);
      await adminClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Test database "${dbName}" created successfully`);
    } else {
      console.log(`✅ Test database "${dbName}" already exists`);
    }
  } catch (error: any) {
    if (error.code === '42P04') {
      // Database already exists (race condition)
      console.log(`✅ Test database "${dbName}" already exists`);
    } else if (error.code === '28P01') {
      // Authentication failed
      console.error('❌ Authentication failed for PostgreSQL user:', dbUsername);
      console.error('');
      console.error('💡 Please check your credentials:');
      console.error('   - Verify the username and password are correct');
      console.error('   - Set environment variables if using different credentials:');
      console.error('     TEST_DB_USERNAME=your_username');
      console.error('     TEST_DB_PASSWORD=your_password');
      throw error;
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Could not connect to PostgreSQL server');
      console.error('');
      console.error('💡 Please ensure PostgreSQL is running:');
      console.error('   - Check if PostgreSQL service is started');
      console.error('   - Verify the host and port are correct');
      throw error;
    } else {
      console.error('❌ Error setting up test database:', error.message);
      console.error('   Error code:', error.code);
      throw error;
    }
  } finally {
    await adminClient.end();
  }
}

// Run setup
setupTestDatabase()
  .then(() => {
    console.log('');
    console.log('✅ Test database setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Failed to setup test database');
    process.exit(1);
  });

