import { Controller, Get, Post } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  // http://localhost:3001/api/v1/user
  @Get()
  getUsera(): any {
    return this.userService.getUsers();
  }
  // http://localhost:3001/api/v1/user
  @Post()
  abstract(): any {
    return this.userService.addUser();
  }
}
