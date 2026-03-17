import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import { ConfigEnum } from 'src/enum/config.enum';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfgService: ConfigService) => {
        const host =
          cfgService.get<string>(ConfigEnum.REDIS_HOST) || '127.0.0.1';
        const port = cfgService.get<number>(ConfigEnum.REDIS_PORT) || 6379;
        const ttl =
          (cfgService.get<number>(ConfigEnum.REDIS_TTL) || 120) * 1000;

        return {
          stores: [new KeyvRedis(`redis://${host}:${port}`)],
          ttl,
        };
      },
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
