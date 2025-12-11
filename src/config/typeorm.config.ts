import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('typeorm', (): TypeOrmModuleOptions => {
  return {
    type: 'postgres',
    url: process.env.DATABASE_URL,

    autoLoadEntities: true,
    // NOTE: synchronize: true is fine for development, but in production
    // it's recommended to use migrations instead for better control and safety
    synchronize: true,

    ssl: true,
    extra: {
      ssl: {
        rejectUnauthorized: false
      }
    }
  };
});

