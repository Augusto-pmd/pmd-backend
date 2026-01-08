import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config();

// Determine if SSL is required
const nodeEnv = process.env.NODE_ENV || 'development';
const databaseUrl = process.env.DATABASE_URL;

// Parse DATABASE_URL to check if SSL is required
// Render always requires SSL in production when using DATABASE_URL
let requiresSsl = false;
if (databaseUrl) {
  try {
    const parsedUrl = new URL(databaseUrl);
    const sslMode = parsedUrl.searchParams.get('sslmode');
    // Force SSL in production (Render) or when explicitly required
    requiresSsl = nodeEnv === 'production' || sslMode === 'require' || sslMode === 'prefer';
  } catch (error) {
    // If URL parsing fails, force SSL in production (Render)
    requiresSsl = nodeEnv === 'production';
  }
}

// Determine entities path based on environment
// In production: use compiled entities from dist/**/*.entity.js
// In development: use source entities from src/**/*.entity.ts
const getEntitiesPath = (): string[] => {
  if (nodeEnv === 'production') {
    // In production, check if compiled entities exist
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      return ['dist/**/*.entity.js'];
    }
    // Fallback to source if compiled don't exist (shouldn't happen in production)
    console.warn('⚠️  Warning: Compiled entities not found in dist, falling back to source');
    return ['src/**/*.entity.ts'];
  }
  // Development: always use source
  return ['src/**/*.entity.ts'];
};

// For local development without DATABASE_URL, use individual variables
const baseOptions: Partial<DataSourceOptions> = {
  type: 'postgres' as const,
  entities: getEntitiesPath(),
  // Determinar qué ruta de migraciones usar
  // En producción: intentar usar compiladas, si no existen, usar fuente
  // En desarrollo: siempre usar fuente
  migrations: (() => {
    if (process.env.NODE_ENV === 'production') {
      const distMigrationsPath = path.join(process.cwd(), 'dist', 'migrations');
      if (fs.existsSync(distMigrationsPath)) {
        const files = fs.readdirSync(distMigrationsPath);
        if (files.some(f => f.endsWith('.js'))) {
          return ['dist/migrations/*.js'];
        }
      }
      // Fallback a fuente si no hay compiladas
      return ['src/migrations/*.ts'];
    }
    return ['src/migrations/*.ts'];
  })(),
  synchronize: false,
  logging: nodeEnv === 'development',
};

// Configure connection based on environment
const connectionOptions: DataSourceOptions = databaseUrl
  ? {
      ...baseOptions,
      url: databaseUrl,
      ...(requiresSsl && {
        ssl: {
          rejectUnauthorized: false
        }
      }),
    } as DataSourceOptions
  : {
      ...baseOptions,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'pmd_management',
      ssl: false,
    } as DataSourceOptions;

export default new DataSource(connectionOptions);

