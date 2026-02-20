import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { ConfigEnum } from 'src/enum/config.enum';

/**
 * JWT Payload 类型定义
 * 与签发 token 时的 payload 保持一致
 */
export interface JwtPayload {
  sub: number;
  username: string;
  roles?: Array<{ id: number; roleName: string }>;
  isAdmin?: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  userID: number;
  userNAME: string;
  roles: Array<{ id: number; roleName: string }>;
  isAdmin: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly cfgService: ConfigService) {
    const secret = cfgService.get<string>(ConfigEnum.JWT_SECRET);
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * validate 在 JWT 验证成功后执行/也就通过了@UseGuards(AuthGuard('jwt')),
   * 其中参数 payload 是从 JWT token 解码得到的对象 (signin function 里 signAsync 生成 token 时的 payload)
   * 其返回的对象会挂载到 req.user
   */
  validate(payload: JwtPayload): AuthUser {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token payload: missing sub');
    }

    // 这里可以添加其他自定义的验证逻辑
    return {
      userID: payload.sub,
      userNAME: payload.username,
      roles: payload.roles || [],
      isAdmin: payload.isAdmin || false,
    };
  }
}
