import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDTO } from 'src/user/dto/create-user.dto';
import { UserEntity } from 'src/user/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signin')
  // http://localhost:3001/api/v1/auth/signin
  login(@Body() dto: any): Promise<any> {
    const { username, password } = dto;
    return this.authService.signin(username, password);
  }

  @Post('signup')
  // http://localhost:3001/api/v1/auth/signup
  register(@Body() dto: CreateUserDTO): Promise<any> {
    const { username, password } = dto;
    return this.authService.signup(username, password);
  }
}
