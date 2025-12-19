#!/usr/bin/env node

const { Client } = require('pg');

async function checkPostgres() {
  const config = {
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'pmd_management',
    connectionTimeoutMillis: 3000,
  };

  const client = new Client(config);

  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

checkPostgres();