import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { LogEntity } from 'src/log/entities/log.entity';
import { LogModule } from 'src/log/log.module';
import { UserRepository } from './user.repository';

@Module({
  //请 TypeORM 帮我在当前模块中注册UserEntity实体的repository，否则我在UserService里就没法用@InjectRepository(UserEntity)
  imports: [TypeOrmModule.forFeature([UserEntity, LogEntity]), LogModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
})
export class UserModule {}

/*
  imports = 用别人的
  providers = 我自己造的
  exports = 借给别人用的
*/
