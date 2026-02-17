import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { ConfigEnum } from 'src/enum/config.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(protected cfgService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        cfgService.get<string>(ConfigEnum.JWT_SECRET) ||
        'what-to-eat-secret-key-build-in-2026-be-better-developer-default-config', // 提供默认值，避免未配置时抛出错误
    });
  }

  // JWT 验证成功后会调用这个方法，payload 是 JWT 中的有效payload
  validate(payload: any) {
    // PassportModule会自动给请求加上.user -- 也就是这个 validate 方法的返回值
    return { userID: payload.sub, userNAME: payload.username };
  }
}
