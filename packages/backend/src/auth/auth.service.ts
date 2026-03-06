import * as argon2 from 'argon2';
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { AuthUser } from './auth.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private jwtService: JwtService,
  ) {}

  async signin(username: string, password: string) {
    const foundUser = await this.userService.findByUserName(username);
    if (!foundUser) {
      throw new UnauthorizedException('No such user found');
    }
    // Google用户没有password, 不允许密码登录
    if (!foundUser.password) {
      throw new UnauthorizedException(
        'This account uses Google login. Please sign in with Google.',
      );
    }
    // 使用argon2进行 密码比对:
    const isPasswordCorrect = await argon2.verify(foundUser.password, password);
    if (isPasswordCorrect === false) {
      throw new UnauthorizedException('Invalid credentials');
    }
    /* 通过 JWT Service, 生成 JWT token:
        将 payload 编码为 JWT Token，并使用配置好的 jwtsecret 进行加密签名，最终生成一个可让前端验证的 token 字符串。
      */
    const access_token = await this.jwtService.signAsync({
      username: foundUser.username,
      sub: foundUser.id, // JWT token 的 payload 里至少要有一个 sub 字段，表示这个 token 是给谁的，通常是用户的 id
      // 其他自定义字段
      roles: foundUser.roles,
      isAdmin: foundUser.roles.some(
        (r) => r.roleName.toLowerCase() === 'admin' || r.id === 1,
      ),
    });
    return {
      access_token,
    };
  }

  async getMeProfile(user: AuthUser) {
    // user 来自 JwtStrategy validate()
    return await this.userService.findById(user.userID);
  }

  async signup(username: string, password: string) {
    const foundUser = await this.userService.findByUserName(username);
    if (foundUser) {
      return new ForbiddenException('User already exist');
    }

    const newUser = await this.userService.create({
      username,
      password,
    });
    return newUser;
  }

  /**
   * Google OAuth 登录/注册
   * 如果用户已存在(通过googleId查找)，直接签发token
   * 如果用户不存在，自动创建新用户后签发token
   */
  async googleLogin(googleUser: {
    googleId: string;
    email: string;
    displayName: string;
    photo?: string;
  }) {
    let user = await this.userService.findByGoogleId(googleUser.googleId);

    if (!user) {
      // 自动注册: 用 displayName 作为 username，如果重复则加随机后缀
      let username = googleUser.displayName || googleUser.email.split('@')[0];
      const existing = await this.userService.findByUserName(username);
      if (existing) {
        username = `${username}_${Date.now().toString(36)}`;
      }

      user = await this.userService.create({
        username,
        googleId: googleUser.googleId,
        email: googleUser.email,
        profile: googleUser.photo ? { photo: googleUser.photo } : undefined,
      });
      // 重新查询以获取 roles 关联
      user = (await this.userService.findById(user.id))!;
    }

    const access_token = await this.jwtService.signAsync({
      username: user!.username,
      sub: user!.id,
      roles: user!.roles || [],
      isAdmin: (user!.roles || []).some(
        (r) => r.roleName.toLowerCase() === 'admin' || r.id === 1,
      ),
    });

    return { access_token };
  }
}
