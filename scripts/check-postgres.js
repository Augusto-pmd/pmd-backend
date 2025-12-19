#!/usr/bin/env node

/**
 * Script para verificar si PostgreSQL está disponible y listo para conexiones
 * Uso: node scripts/check-postgres.js
 * Exit code: 0 si está disponible, 1 si no está disponible
 */

const { Client } = require('pg');

// Obtener configuración de conexión
function getConnectionConfig() {
  // Prioridad 1: DATABASE_URL (más confiable)
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 3000,
    };
  }

  // Prioridad 2: Variables individuales
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'pmd_management',
    connectionTimeoutMillis: 3000,
  };
}

// Función principal
async function checkPostgres() {
  const config = getConnectionConfig();
  const client = new Client(config);

  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    
    // Éxito - PostgreSQL está disponible
    process.exit(0);
  } catch (error) {
    // Error - PostgreSQL no está disponible o hay un problema de conexión
    // No imprimir el error para mantener el output limpio
    // El script start.sh manejará el logging
    process.exit(1);
  }
}

// Ejecutar verificación
checkPostgres();

