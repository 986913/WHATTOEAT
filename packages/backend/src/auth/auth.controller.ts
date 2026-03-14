import {
  Controller,
  Post,
  Body,
  UseFilters,
  Get,
  UseGuards,
  Req,
  Res,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { TypeormFilter } from 'src/filters/typeorm.filter';
import { SigninUserDTO } from './dto/signin-user.dto';
import { SignupUserDTO } from './dto/signup-user.dto';
import { ForgotPasswordDTO } from './dto/forgot-password.dto';
import { ResetPasswordDTO } from './dto/reset-password.dto';
import { JwtAuthenticationGuard } from 'src/guards/jwt.guard';
import { GoogleAuthGuard } from 'src/guards/google.guard';
import { AuthRequest } from 'src/guards/admin.guard';
import { ConfigService } from '@nestjs/config';
import { ConfigEnum } from 'src/enum/config.enum';
import { GoogleAuthRequest } from 'src/guards/google.guard';

@UseFilters(new TypeormFilter())
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  // http://localhost:3001/api/v1/auth/signin
  @Post('signin')
  async login(@Body() dto: SigninUserDTO): Promise<any> {
    const { username, password } = dto;
    const { access_token } = await this.authService.signin(username, password);
    // 返回一个对象，包含 access_token 字段，值是生成的 JWT token
    return { access_token };
  }

  // http://localhost:3001/api/v1/auth/me
  @Get('me')
  @UseGuards(JwtAuthenticationGuard)
  getMe(@Req() req: AuthRequest) {
    // 通过 JwtAuthenticationGuard 也就是 AuthGuard('jwt') 验证 JWT token 后，PassportModule 会自动将用户信息添加到 request 的 user 字段中
    return this.authService.getMeProfile(req.user);
  }

  // http://localhost:3001/api/v1/auth/signup
  @Post('signup')
  register(@Body() dto: SignupUserDTO): Promise<any> {
    const { username, password, email } = dto;
    return this.authService.signup(username, password, email);
  }

  // http://localhost:3001/api/v1/auth/forgot-password
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDTO) {
    return this.authService.forgotPassword(dto.username);
  }

  // http://localhost:3001/api/v1/auth/reset-password
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDTO) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  // http://localhost:3001/api/v1/auth/google
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // GoogleAuthGuard 会自动重定向到 Google 登录页面
  }

  // http://localhost:3001/api/v1/auth/google/callback
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: GoogleAuthRequest, @Res() res: Response) {
    const { access_token } = await this.authService.googleLogin(req.user);
    // 重定向到前端，通过 query param 传递 token
    const frontendUrl = this.configService.get<string>(ConfigEnum.FRONTEND_URL);
    res.redirect(`${frontendUrl}/auth/google/callback?token=${access_token}`);
  }
}
