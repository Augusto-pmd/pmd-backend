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

// For local development without DATABASE_URL, use individual variables
const baseOptions: Partial<DataSourceOptions> = {
  type: 'postgres' as const,
  entities: [
    process.env.NODE_ENV === 'production'
      ? 'dist/**/*.entity.js'
      : 'src/**/*.entity.ts'
  ],
  migrations: [
    process.env.NODE_ENV === 'production'
      ? 'dist/migrations/*.js'
      : 'src/migrations/*.ts'
  ],
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

