/* eslint-disable @typescript-eslint/no-misused-promises */

import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { AllExceptionFilter } from './filters/all-exception.filter';
import { SlackService } from './slack/slack.service';
import { ValidationPipe } from '@nestjs/common';

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
  const slackService = app.get(SlackService);
  app.useGlobalFilters(
    new AllExceptionFilter(logger, httpAdapter, slackService),
  );

  /* Global 使用 ValidationPipe 进行DTO验证, 体现在CreateUserPipe中： 
      请求 → ValidationPipe → class-validator 校验 DTO → 如果失败 → 抛异常
  */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动去除 DTO 中不存在的属性
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
  console.log(`🚀 Backend running at ${process.env.PORT ?? 3001}`);

  if (module?.hot) {
    module.hot.accept(() => console.log('🔁  HMR Reloading...'));
    module.hot.dispose(() => app.close());
  }
}

bootstrap();
