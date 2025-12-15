import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import configuration from '../configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 全局注入 ConfigService
      load: [configuration], // 加载合并后的 YAML 配置
    }),
    UserModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
