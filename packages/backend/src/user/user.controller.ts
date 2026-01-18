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
  Inject,
  LoggerService,
  UseFilters,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ConfigService } from '@nestjs/config';
import { GetUsersDTO } from './dto/get-user.dto';
import { UserEntity } from './entities/user.entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TypeormFilter } from 'src/filters/typeorm.filter';

@Controller('users')
@UseFilters(new TypeormFilter())
export class UserController {
  constructor(
    private userService: UserService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    this.logger.log('UserController initialized');
  }

  /* 基本的获取全部Users -- http://localhost:3001/api/v1/users
    getUsers(): any {
      this.logger.log('Fetching all users');
      console.log(this.configService.get(ConfigEnum.DB_NAME));
      return this.userService.findAll();
    }
  */
  @Get()
  // (通过 QueryPara 获取符合条件的users) -- http://localhost:3001/api/v1/users?username=[ming]&role=[1]&gender=[1]
  getUsers(@Query() query: GetUsersDTO): any {
    return this.userService.findAll(query);
  }

  @Get('/profile')
  // (通过 QueryPara 读取一个user的profile) -- http://localhost:3000/api/v1/users/profile/?id=[3]
  getUserProfile(@Query('id', ParseIntPipe) userId: number): any {
    this.logger.log(`Fetching profile for user ID: ${userId}`);
    return this.userService.findProfile(userId);
  }

  @Get('/logs')
  // (通过 QueryPara 读取一个user的所有logs) -- http://localhost:3000/api/v1/users/logs/[?id=3]
  getUserLogs(@Query('id', ParseIntPipe) userId: number): any {
    this.logger.log(`Fetching logs for user ID: ${userId}`);
    return this.userService.findLogs(userId);
  }

  @Get('/logsByGroup')
  // (通过 QueryPara 读取一个user的所有logs, 结果按result分组) -- http://localhost:3000/api/v1/users/logsByGroup/?id=[1]
  getUserLogsGroupedByResult(@Query('id', ParseIntPipe) userId: number): any {
    this.logger.log(`Fetching logs grouped by result for user ID: ${userId}`);
    return this.userService.findLogsGroupedByResult(userId);
  }

  @Post()
  // http://localhost:3001/api/v1/users
  addUser(@Body() dto: any): any {
    this.logger.log('Adding a new user');
    return this.userService.create(dto as UserEntity);
  }

  @Get('/:id')
  // (通过 PathPara 获取一个user) --  http://localhost:3001/api/v1/users/[1]
  getUser(@Param('id') userId: number): any {
    this.logger.log(`Fetching single user who id is ${userId}`);
    return this.userService.findById(userId);
  }

  @Put('/:id')
  // (通过 PathPara 更新一个user) -- http://localhost:3001/api/v1/users/[1]
  updateUser(@Param('id') userId: number, @Body() dto: any): any {
    this.logger.log(`Updating user with ID: ${userId}`);
    // 权限1: 判断用户是否是自己
    // 权限2: 判断和用户能否有更新的权限
    // 返回数据： 不能包含敏感的password等信息
    return this.userService.update(userId, dto as UserEntity);
  }

  @Delete('/:id')
  // (通过 PathPara 删除一个user) -- http://localhost:3001/api/v1/users/[1]
  deleteUser(@Param('id') userId: number): any {
    this.logger.log(`Deleting user with ID: ${userId}`);
    return this.userService.remove(userId);
  }
}
