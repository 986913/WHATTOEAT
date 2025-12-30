import { Controller, Get, Post, Put, Param, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { ConfigService } from '@nestjs/config';
import { ConfigEnum } from 'src/enum/config.enum';
import { UserEntity } from './entities/user.entity';

@Controller('user')
export class UserController {
  constructor(
    private userService: UserService,
    private configService: ConfigService,
  ) {}

  // http://localhost:3001/api/v1/user
  @Get()
  getUsers(): any {
    console.log(this.configService.get(ConfigEnum.DB_NAME));
    return this.userService.findAll();
  }

  // http://localhost:3001/api/v1/user
  @Post()
  addUser(): any {
    const newUser = {
      username: 'yoyo',
      password: '123',
    } as UserEntity;
    return this.userService.create(newUser);
  }

  // 通过path para更新一个user, URL: http://localhost:3001/api/v1/user/[1]
  @Put('/:id')
  updateUser(@Param('id') userId: number): any {
    const updatedUser = {
      username: 'yoyo Liu',
      password: '123',
    } as UserEntity;
    return this.userService.update(userId, updatedUser);
  }

  // 通过path para删除一个user, URL: http://localhost:3001/api/v1/user/[1]
  @Delete('/:id')
  deleteUser(@Param('id') userId: number): any {
    return this.userService.remove(userId);
  }
}
