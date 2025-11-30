import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('typeorm', (): TypeOrmModuleOptions => {
  return {
    type: 'postgres',
    url: process.env.DATABASE_URL,

    autoLoadEntities: true,
    synchronize: true,

    ssl: true,
    extra: {
      ssl: {
        rejectUnauthorized: false
      }
    }
  };
});

