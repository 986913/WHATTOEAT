import { Controller, Post, Body, UseFilters } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TypeormFilter } from 'src/filters/typeorm.filter';
import { SigninUserDTO } from './dto/signin-user.dto';

@UseFilters(new TypeormFilter())
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signin')
  // http://localhost:3001/api/v1/auth/signin
  login(@Body() dto: SigninUserDTO): Promise<any> {
    const { username, password } = dto;
    return this.authService.signin(username, password);
  }

  @Post('signup')
  // http://localhost:3001/api/v1/auth/signup
  register(@Body() dto: SigninUserDTO): Promise<any> {
    const { username, password } = dto;
    return this.authService.signup(username, password);
  }
}
