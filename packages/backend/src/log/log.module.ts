import { Module } from '@nestjs/common';
import { utilities, WinstonModule } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import { Console } from 'winston/lib/winston/transports';
import { LogEnum } from 'src/enum/config.enum';
import { LogService } from './log.service';
import { LogRepository } from './log.repository';

@Module({
  //请 WinstonModule 帮我在当前模块中注册 Winston Logger单例实例, 否则我在其他模块里就没法用@Inject(WINSTON_MODULE_NEST_PROVIDER)
  imports: [
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const consoleTransports = new Console({
          level: configService.get<string>(LogEnum.LOG_LEVEL) || 'info',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.simple(),
            utilities.format.nestLike(),
          ),
        });
        return {
          transports: [consoleTransports],
        };
      },
    }),
  ],
  controllers: [],
  providers: [LogService, LogRepository],
  exports: [LogService],
})
export class LogModule {}
