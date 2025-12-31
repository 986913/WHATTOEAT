import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { LogEntity } from 'src/log/entities/log.entity';

@Module({
  //请 TypeORM 帮我在当前模块中注册UserEntity实体的repository，否则我在UserService里就没法用@InjectRepository(UserEntity)
  imports: [TypeOrmModule.forFeature([UserEntity, LogEntity])],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
