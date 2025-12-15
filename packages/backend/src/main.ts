import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  app.setGlobalPrefix('api/v1'); // <-- 在这里设置了一个 全局的API prefix

  await app.listen(process.env.PORT ?? 3001);
  console.log(`🚀 Backend running at http://localhost:3001`);
}
bootstrap();
