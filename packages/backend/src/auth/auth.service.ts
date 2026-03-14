import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/user/user.service';
import { MailService } from 'src/mail/mail.service';
import { ConfigEnum } from 'src/enum/config.enum';
import { AuthUser } from './auth.strategy';
import { GoogleAuthUser } from './google.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
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
   * 忘记密码 - 生成重置token
   * 返回 reset token（开发环境直接返回，生产环境应通过邮件发送）
   */
  async forgotPassword(username: string) {
    const user = await this.userService.findByUserName(username);
    if (!user) {
      throw new BadRequestException(
        'No account found with that username. Please check your username and try again.',
      );
    }

    // Google-only 用户不能重置密码
    if (user.googleId && !user.password) {
      return {
        message: 'This account uses Google login. Please sign in with Google.',
      };
    }

    // 生成 reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30分钟有效

    await this.userService.saveResetToken(user.id, resetToken, resetExpires);

    const frontendUrl =
      this.configService.get<string>(ConfigEnum.FRONTEND_URL) ||
      'http://localhost:3000';

    // 尝试通过邮件发送 reset link
    const emailSent = user.email
      ? await this.mailService.sendPasswordResetEmail(
          user.email,
          username,
          resetToken,
          frontendUrl,
        )
      : false;

    if (emailSent) {
      // 生产环境: 邮件发送成功，不返回token
      return {
        message: 'A password reset link has been sent to your email.',
      };
    }

    // 开发环境 或 邮件未配置: 直接返回token方便前端跳转
    console.log(`🔑 Password reset token for "${username}": ${resetToken}`);
    return {
      message: 'Password reset link generated.',
      resetToken,
    };
  }

  /**
   * 重置密码 - 通过 reset token 验证后设置新密码
   */
  async resetPassword(token: string, newPassword: string) {
    const user = await this.userService.findByResetToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const hashedPassword = await argon2.hash(newPassword);
    await this.userService.resetPassword(user.id, hashedPassword);

    return { message: 'Password has been reset successfully' };
  }

  /**
   * Google OAuth 登录/注册
   * 如果用户已存在(通过googleId查找)，直接签发token
   * 如果用户不存在，自动创建新用户后签发token
   */
  async googleLogin(googleUser: GoogleAuthUser) {
    if (!googleUser.email) {
      throw new UnauthorizedException('Google account has no email');
    }
    let user = await this.userService.findByGoogleId(googleUser.googleId);

    if (!user) {
      // 检查是否已有相同 email 的用户（比如之前用密码注册的）
      const existingByEmail = await this.userService.findByEmail(
        googleUser.email,
      );

      if (existingByEmail) {
        // email 已存在：绑定 googleId 到现有账户
        existingByEmail.googleId = googleUser.googleId;
        await this.userService.bindGoogleId(
          existingByEmail.id,
          googleUser.googleId,
        );
        user = existingByEmail;
      } else {
        // 全新用户：自动注册，用 displayName 作为 username，如果重复则加随机后缀
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
    }

    /* 通过 JWT Service, 生成 JWT token:
        将 payload 编码为 JWT Token，并使用配置好的 jwtsecret 进行加密签名，最终生成一个可让前端验证的 token 字符串。
      */
    const access_token = await this.jwtService.signAsync({
      username: user.username,
      sub: user.id,
      roles: user.roles || [],
      isAdmin: (user.roles || []).some(
        (r) => r.roleName.toLowerCase() === 'admin' || r.id === 1,
      ),
    });

    return { access_token };
  }
}
