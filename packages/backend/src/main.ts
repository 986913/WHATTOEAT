/* eslint-disable @typescript-eslint/no-misused-promises */

import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { AllExceptionFilter } from './filters/all-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 获取 Winston Logger 实例
  const logger = app.get<WinstonLogger>(WINSTON_MODULE_NEST_PROVIDER);
  // Global 使用同一 winston logger 实例, 替换掉 Nest默认的Logger
  app.useLogger(logger);
  // 设置Global的 API prefix
  app.setGlobalPrefix('api/v1');
  // Global 使用自定义的AllExceptionFilter进行Error handling捕获所有异常 (若只想捕获HTTP异常就用HttpExceptionFilter）
  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionFilter(logger, httpAdapter));

  await app.listen(process.env.PORT ?? 3001);
  console.log(`🚀 Backend running at http://localhost:3001`);

  // if (module.hot) {
  //   module.hot.accept(() => console.log('🔁  HMR Reloading...'));
  //   module.hot.dispose(() => app.close());
  // }
}

bootstrap();
