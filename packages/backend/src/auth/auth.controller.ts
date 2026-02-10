import {
  Controller,
  Post,
  Body,
  HttpException,
  UseFilters,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDTO } from 'src/user/dto/create-user.dto';
import { TypeormFilter } from 'src/filters/typeorm.filter';

@UseFilters(new TypeormFilter())
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signin')
  // http://localhost:3001/api/v1/auth/signin
  login(@Body() dto: any): Promise<any> {
    const { username, password } = dto;
    if (!username || !password) {
      throw new HttpException('Username and password are required', 400);
    }
    return this.authService.signin(username, password);
  }

  @Post('signup')
  // http://localhost:3001/api/v1/auth/signup
  register(@Body() dto: CreateUserDTO): Promise<any> {
    const { username, password } = dto;
    if (!username || !password) {
      throw new HttpException('Username and password are required', 400);
    }
    if (typeof username !== 'string' || typeof password !== 'string') {
      throw new HttpException('Username and password must be strings', 400);
    }
    if (
      (typeof username == 'string' && username.length <= 6) ||
      (typeof password == 'string' && password.length <= 6)
    ) {
      throw new HttpException(
        'Username and password must be at least 6 chars',
        400,
      );
    }
    return this.authService.signup(username, password);
  }
}
