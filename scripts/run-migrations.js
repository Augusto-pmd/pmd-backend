#!/usr/bin/env node

/**
 * Script para ejecutar migraciones en producción
 * Usa las migraciones compiladas de dist/migrations/*.js
 */

const { DataSource } = require('typeorm');
const path = require('path');

// Cargar variables de entorno (si dotenv está disponible)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv no está disponible, usar variables de entorno del sistema
  // Esto es normal en producción donde Render ya configura las variables
}

// Determinar si SSL es requerido
const nodeEnv = process.env.NODE_ENV || 'production';
const databaseUrl = process.env.DATABASE_URL;

let requiresSsl = false;
if (databaseUrl) {
  try {
    const parsedUrl = new URL(databaseUrl);
    const sslMode = parsedUrl.searchParams.get('sslmode');
    requiresSsl = nodeEnv === 'production' || sslMode === 'require' || sslMode === 'prefer';
  } catch (error) {
    requiresSsl = nodeEnv === 'production';
  }
}

// Configurar DataSource para producción
const dataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: [path.join(__dirname, '../dist/**/*.entity.js')],
  migrations: [path.join(__dirname, '../dist/migrations/*.js')],
  synchronize: false,
  logging: false,
  ...(requiresSsl && {
    ssl: {
      rejectUnauthorized: false
    }
  }),
});

async function runMigrations() {
  // Verificar si DATABASE_URL está disponible
  if (!databaseUrl) {
    console.log('⚠️  DATABASE_URL no está configurado, saltando ejecución de migraciones');
    console.log('ℹ️  Las migraciones deben ejecutarse manualmente después del deploy');
    process.exit(0); // Salir con éxito para no fallar el build
  }

  try {
    console.log('🔄 Conectando a la base de datos...');
    await dataSource.initialize();
    console.log('✅ Conexión establecida');

    console.log('🔄 Ejecutando migraciones...');
    const migrations = await dataSource.runMigrations();
    
    if (migrations.length === 0) {
      console.log('ℹ️  No hay migraciones pendientes');
    } else {
      console.log(`✅ ${migrations.length} migración(es) ejecutada(s):`);
      migrations.forEach((migration) => {
        console.log(`   - ${migration.name}`);
      });
    }

    await dataSource.destroy();
    console.log('✅ Migraciones completadas');
    process.exit(0);
  } catch (error) {
    // Si es un error de conexión durante el build, no fallar
    const isConnectionError = error.message && (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('timeout') ||
      error.message.includes('getaddrinfo') ||
      error.message.includes('ENOTFOUND')
    );

    if (isConnectionError && process.env.NODE_ENV === 'production') {
      console.log('⚠️  No se pudo conectar a la base de datos durante el build');
      console.log('ℹ️  Esto es normal. Las migraciones se ejecutarán automáticamente al iniciar la aplicación');
      console.log('ℹ️  O ejecuta manualmente: npm run migration:run:prod');
      process.exit(0); // Salir con éxito para no fallar el build
    }

    console.error('❌ Error ejecutando migraciones:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

runMigrations();
