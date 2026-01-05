import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { UserEntity } from './src/user/entities/user.entity';
import { ProfileEntity } from './src/user/entities/profile.entity';
import { RoleEntity } from './src/role/entities/role.entity';
import { LogEntity } from './src/log/entities/log.entity';

export default {
  type: 'mysql',
  host: 'localhost',
  port: 3307,
  username: 'root',
  password: 'rootpass',
  database: 'testdb',
  synchronize: true, // 注意：生产环境慎用，一般本地初始化时使用，用来同步本地的schmema到数据库
  entities: [UserEntity, ProfileEntity, RoleEntity, LogEntity],
  logging: false, //关闭typeorm日志
} as TypeOrmModuleOptions;
