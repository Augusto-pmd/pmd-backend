import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export function databaseConfig(configService: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'postgres'),
    database: configService.get<string>('DB_DATABASE', 'pmd_management'),
    entities: [__dirname + '/../**/*.entity.{ts,js}'],
    synchronize: false,
    logging: configService.get<string>('NODE_ENV') === 'development',
    autoLoadEntities: true,
    retryAttempts: 3,
    retryDelay: 3000,
  };
}
