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
  Headers,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ConfigService } from '@nestjs/config';
import { GetUsersDTO } from './dto/get-users.dto';
import { CreateUserDTO } from './dto/create-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { CreateUserPipe } from './pipes/create-user.pipe';
import { UpdateUserPipe } from './pipes/update-user.pipe';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TypeormFilter } from 'src/filters/typeorm.filter';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from 'src/guards/admin.guard';
import { AuthRequest } from 'src/guards/admin.guard';

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
  @UseGuards(AuthGuard('jwt'))
  getUsers(@Query() query: GetUsersDTO, @Req() req: AuthRequest): any {
    // 通过 AuthGuard('jwt') 验证 JWT token 后，PassportModule 会自动将用户信息添加到 request 的 user 字段中
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
  addUser(@Body(CreateUserPipe) dto: CreateUserDTO): any {
    this.logger.log('Adding a new user');
    return this.userService.create(dto);
  }

  @Get('/:id')
  // (通过 PathPara 获取一个user) --  http://localhost:3001/api/v1/users/[1]
  getUser(@Param('id', ParseIntPipe) userId: number): any {
    this.logger.log(`Fetching single user who id is ${userId}`);
    return this.userService.findById(userId);
  }

  @Put('/:id')
  // (通过 PathPara 更新一个user) -- http://localhost:3001/api/v1/users/[1]
  @UseGuards(AuthGuard('jwt'))
  /**
    保护这个路由，只有通过 JWT 验证的用户才能访问
      读取 Authorization header
      拿出 token
      用 JWT_SECRET 验证签名
      如果合法 → 放行
      如果非法 → 401 Unauthorized
  **/
  updateUser(
    @Param('id', ParseIntPipe) userId: number,
    @Body(UpdateUserPipe) dto: UpdateUserDTO,
    // @Headers('Authorization') headers: any,
  ): any {
    this.logger.log(`Updating user with ID: ${userId}`);
    // 权限1: 判断用户是否是自己 - 说明当前user在尝试update自己的信息
    // 权限2: 判断和用户能否有更新的权限
    // 返回数据： 不能包含敏感的password等信息

    return this.userService.update(userId, dto);
    // if (headers === userId) {
    // return this.userService.update(userId, dto);
    // } else {
    //   throw new UnauthorizedException();
    // }
  }

  @Delete('/:id')
  // (通过 PathPara 删除一个user) -- http://localhost:3001/api/v1/users/[1]
  /** 🚀🚀🚀
   * Authentication vs. Authorization
   *   - AuthGuard('jwt') ->  verifies the request has a valid JWT and attaches the user to the request (authentication).
   *   - AdminGuard       ->  enforces role checks for the authenticated user (authorization).
   *
   * Authorization requires a verified identity, so AuthGuard('jwt') must run before AdminGuard.
   * 一旦通过验证，用户的角色和权限将被检查。如果用户没有足够的权限，将返回403 Forbidden错误。不会进入到deleteUser方法中。
   */
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  deleteUser(
    @Param('id', ParseIntPipe) userId: number,
    @Req() req: AuthRequest,
  ): any {
    console.log(req.user);
    this.logger.log(`Deleting user with ID: ${userId}`);
    return this.userService.remove(userId);
  }
}
