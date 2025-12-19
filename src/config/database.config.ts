import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

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

export function databaseConfig(configService: ConfigService): TypeOrmModuleOptions {
  const databaseUrl = configService.get<string>('DATABASE_URL');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // If DATABASE_URL exists, use it (production mode - Render)
  if (databaseUrl) {
    const parsed = parseDatabaseUrl(databaseUrl);
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
