import ormconfig from 'ormconfig';
import { Module } from '@nestjs/common';
import configuration from '../configuration';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogModule } from './log/log.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 全局注入 ConfigService
      load: [configuration], // 加载合并后的 YAML 配置
    }),
    TypeOrmModule.forRoot(ormconfig),
    UserModule,
    LogModule, // 引入 LogModule 来注册 Winston logger(单例)
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
