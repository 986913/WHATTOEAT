import { Module } from '@nestjs/common';
import { LogModule } from './log/log.module';
import configuration from '../configuration';
import { UserModule } from './user/user.module';
import { MealModule } from './meal/meal.module';
import { PlanModule } from './plan/plan.module';
import { ConfigEnum } from './enum/config.enum';
import { LogEntity } from './log/entities/log.entity';
import { UserEntity } from './user/entities/user.entity';
import { RoleEntity } from './role/entities/role.entity';
import { ProfileEntity } from './user/entities/profile.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { MealEntity } from './meal/entities/meal.entity';
import { TypeEntity } from './type/entities/type.entity';
import { IngredientEntity } from './ingredient/entities/ingredient.entity';
import { PlanEntity } from './plan/entities/plan.entity';
import { IngredientModule } from './ingredient/ingredient.module';
import { AuthModule } from './auth/auth.module';
import { RedisCacheModule } from './cache/redis-cache.module';

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
      useFactory: (cfgService: ConfigService) => {
        const host = cfgService.get<string>(ConfigEnum.DB_HOST);
        const nodeEnv = process.env.NODE_ENV;
        // 🚨 安全护栏：防止本地 / docker 误连生产数据库
        if (
          nodeEnv !== 'production' &&
          typeof host === 'string' &&
          host.includes('rds.amazonaws.com')
        ) {
          throw new Error(
            `❌ 非生产环境禁止连接生产数据库！当前 NODE_ENV=${nodeEnv}, DB_HOST=${host}`,
          );
        }
        return {
          type: cfgService.get(ConfigEnum.DB_TYPE),
          host: cfgService.get(ConfigEnum.DB_HOST),
          port: cfgService.get(ConfigEnum.DB_PORT),
          username: cfgService.get(ConfigEnum.DB_USERNAME),
          password: cfgService.get(ConfigEnum.DB_PASSWORD),
          database: cfgService.get(ConfigEnum.DB_NAME),
          synchronize: cfgService.get(ConfigEnum.DB_SYNC), // 注意：生产环境慎用，一般本地初始化时使用，用来同步本地的schmema到数据库
          entities: [
            UserEntity,
            ProfileEntity,
            RoleEntity,
            LogEntity,
            MealEntity,
            TypeEntity,
            IngredientEntity,
            PlanEntity,
          ],
          logging: false, //关闭typeorm日志
        } as TypeOrmModuleOptions;
      },
    }),
    RedisCacheModule,
    UserModule,
    MealModule,
    IngredientModule,
    PlanModule,
    LogModule,
    AuthModule, // 引入 LogModule 来注册 Winston logger(单例)
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
