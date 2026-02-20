import { Injectable, UnauthorizedException } from '@nestjs/common';
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
    if (foundUser.password !== password) {
      throw new UnauthorizedException('Invalid password');
    }
    if (foundUser && foundUser.password === password) {
      /* 通过 JWT Service, 生成 JWT token:
        将 payload 编码为 JWT Token，并使用配置好的 jwtsecret 进行加密签名，最终生成一个可让前端验证的 token 字符串。
      */
      const access_token = await this.jwtService.signAsync(
        {
          username: foundUser.username,
          sub: foundUser.id, // JWT token 的 payload 里至少要有一个 sub 字段，表示这个 token 是给谁的，通常是用户的 id
          // 其他自定义字段
          roles: foundUser.roles,
          isAdmin: foundUser.roles.some(
            (r) => r.roleName.toLowerCase() === 'admin' || r.id === 1,
          ),
        },
        // 局部设置 -> refreshToken
        // {
        //   expiresIn: '3d', // 设置 token 的过期时间
        // },
      );
      return {
        access_token,
      };
    }

    throw new UnauthorizedException('Invalid credentials');
  }

  async getMeProfile(user: AuthUser) {
    // user 来自 JwtStrategy validate()
    return await this.userService.findById(user.userID);
  }

  async signup(username: string, password: string) {
    const newUser = await this.userService.create({
      username,
      password,
    });
    return newUser;
  }
}
