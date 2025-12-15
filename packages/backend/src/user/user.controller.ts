import { Controller, Get, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { ConfigService } from '@nestjs/config';
import { ConfigEnum } from 'src/enum/config.enum';

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
    return this.userService.getUsers();
  }

  // http://localhost:3001/api/v1/user
  @Post()
  addUser(): any {
    return this.userService.addUser();
  }
}
