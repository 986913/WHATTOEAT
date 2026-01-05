import { Module } from '@nestjs/common';
import { LogModule } from './log/log.module';
import configuration from '../configuration';
import { UserModule } from './user/user.module';
import { ConfigEnum } from './enum/config.enum';
import { LogEntity } from './log/entities/log.entity';
import { UserEntity } from './user/entities/user.entity';
import { RoleEntity } from './role/entities/role.entity';
import { ProfileEntity } from './user/entities/profile.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 全局注入 ConfigService
      load: [configuration], // 加载合并后的 YAML 配置
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], // 导入 ConfigModule 以使用 ConfigService
      inject: [ConfigService], // 注入 ConfigService
      // 使用 ConfigService 来动态配置 TypeORM
      useFactory: (cfgService: ConfigService) =>
        ({
          type: cfgService.get(ConfigEnum.DB_TYPE),
          host: cfgService.get(ConfigEnum.DB_HOST),
          port: cfgService.get(ConfigEnum.DB_PORT),
          username: cfgService.get(ConfigEnum.DB_USERNAME),
          password: cfgService.get(ConfigEnum.DB_PASSWORD),
          database: cfgService.get(ConfigEnum.DB_NAME),
          synchronize: cfgService.get(ConfigEnum.DB_SYNC), // 注意：生产环境慎用，一般本地初始化时使用，用来同步本地的schmema到数据库
          entities: [UserEntity, ProfileEntity, RoleEntity, LogEntity],
          logging: false, //关闭typeorm日志
        }) as TypeOrmModuleOptions,
    }),
    UserModule,
    LogModule, // 引入 LogModule 来注册 Winston logger(单例)
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
