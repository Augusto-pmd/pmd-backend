import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Parse DATABASE_URL into connection parameters
 */
function parseDatabaseUrl(url: string): {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  requiresSsl: boolean;
} {
  try {
    const parsedUrl = new URL(url);
    const sslMode = parsedUrl.searchParams.get('sslmode');
    
    return {
      host: parsedUrl.hostname,
      port: parseInt(parsedUrl.port || '5432', 10),
      username: parsedUrl.username,
      password: parsedUrl.password,
      database: parsedUrl.pathname.slice(1), // Remove leading '/'
      requiresSsl: sslMode === 'require' || sslMode === 'prefer',
    };
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL: ${error.message}`);
  }
}

/**
 * Determine migrations path based on environment
 * In production (Render): use compiled migrations from dist/migrations/*.js
 * In development: use source migrations from src/migrations/*.ts
 */
function getMigrationsPath(): string[] {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (nodeEnv === 'production') {
    // In production, check if compiled migrations exist
    const distMigrationsPath = path.join(process.cwd(), 'dist', 'migrations');
    if (fs.existsSync(distMigrationsPath)) {
      const files = fs.readdirSync(distMigrationsPath);
      if (files.some(f => f.endsWith('.js'))) {
        return ['dist/migrations/*.js'];
      }
    }
    // Fallback to source if compiled don't exist (shouldn't happen in production)
    console.warn('⚠️  Warning: Compiled migrations not found in dist/migrations, falling back to source');
    return ['src/migrations/*.ts'];
  }
  
  // Development: always use source
  return ['src/migrations/*.ts'];
}

export function databaseConfig(configService: ConfigService): TypeOrmModuleOptions {
  const databaseUrl = configService.get<string>('DATABASE_URL');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  
  // In test mode, this config will be overridden by TestDatabaseModule
  // Return a minimal config to prevent connection attempts
  if (nodeEnv === 'test' || process.env.JEST_WORKER_ID !== undefined) {
    return {
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'pmd_management_test',
      synchronize: false,
      logging: false,
      autoLoadEntities: true,
      retryAttempts: 0, // Don't retry in test mode
    } as TypeOrmModuleOptions;
  }

  // If DATABASE_URL exists, use it (production mode - Render)
  if (databaseUrl) {
    const parsed = parseDatabaseUrl(databaseUrl);
    const isProduction = nodeEnv === 'production';
    
    return {
      type: 'postgres',
      host: parsed.host,
      port: parsed.port,
      username: parsed.username,
      password: parsed.password,
      database: parsed.database,
      synchronize: false,
      logging: nodeEnv === 'development',
      autoLoadEntities: true,
      // Ejecutar migraciones automáticamente en producción (Render)
      // Las migraciones deben estar compiladas en dist/migrations/*.js durante el build
      // Esto se ejecuta automáticamente cuando la aplicación inicia en Render
      migrationsRun: isProduction,
      migrations: getMigrationsPath(),
      retryAttempts: 3,
      retryDelay: 3000,
      ssl: parsed.requiresSsl ? {
        rejectUnauthorized: false,
      } : false,
    } as TypeOrmModuleOptions;
  }

  // Fallback to individual variables (development mode)
  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'postgres'),
    database: configService.get<string>('DB_DATABASE', 'pmd_management'),
    synchronize: false,
    logging: nodeEnv === 'development',
    autoLoadEntities: true,
    retryAttempts: 3,
    retryDelay: 3000,
    // No SSL for local development
    ssl: false,
  };
}
