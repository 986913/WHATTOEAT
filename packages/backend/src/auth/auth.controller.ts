import {
  Controller,
  Post,
  Body,
  UseFilters,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { TypeormFilter } from 'src/filters/typeorm.filter';
import { SigninUserDTO } from './dto/signin-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuthRequest } from 'src/guards/admin.guard';

@UseFilters(new TypeormFilter())
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signin')
  // http://localhost:3001/api/v1/auth/signin
  async login(@Body() dto: SigninUserDTO): Promise<any> {
    const { username, password } = dto;
    const { access_token } = await this.authService.signin(username, password);
    // 返回一个对象，包含 access_token 字段，值是生成的 JWT token
    return { access_token };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@Req() req: AuthRequest) {
    // 通过 AuthGuard('jwt') 验证 JWT token 后，PassportModule 会自动将用户信息添加到 request 的 user 字段中
    return this.authService.getMeProfile(req.user);
  }

  @Post('signup')
  // http://localhost:3001/api/v1/auth/signup
  register(@Body() dto: SigninUserDTO): Promise<any> {
    const { username, password } = dto;
    return this.authService.signup(username, password);
  }
}
