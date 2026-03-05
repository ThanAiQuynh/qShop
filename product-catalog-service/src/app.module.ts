import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { WinstonModule } from 'nest-winston';
import { loggerConfig } from './common/utils/logger.config';
import { HealthModule } from './api/v1/health/health.module';

import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    WinstonModule.forRoot(loggerConfig),
    HealthModule,
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: redisStore,
        url: config.get('redisUrl'),
        ttl: 3600,
      }),
    }),
  ],
})
export class AppModule { }
