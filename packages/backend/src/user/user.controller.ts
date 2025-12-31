import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  Body,
} from '@nestjs/common';
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
  addUser(@Body() payload: any): any {
    return this.userService.create(payload as UserEntity);
  }

  // (通过 PathPara 更新一个user) -- http://localhost:3001/api/v1/user/[1]
  @Put('/:id')
  updateUser(@Param('id') userId: number, @Body() payload: any): any {
    return this.userService.update(userId, payload as UserEntity);
  }

  // (通过 PathPara 删除一个user) -- http://localhost:3001/api/v1/user/[1]
  @Delete('/:id')
  deleteUser(@Param('id') userId: number): any {
    return this.userService.remove(userId);
  }

  // (通过 QueryPara 读取一个user的profile) -- http://localhost:3000/api/v1/user/profile/[?id=3]
  @Get('/profile')
  getUserProfile(@Query('id', ParseIntPipe) userId: number): any {
    return this.userService.findProfile(userId);
  }

  // (通过 QueryPara 读取一个user的所有logs) -- http://localhost:3000/api/v1/user/logs/[?id=3]
  @Get('/logs')
  getUserLogs(@Query('id', ParseIntPipe) userId: number): any {
    return this.userService.findLogs(userId);
  }
}
