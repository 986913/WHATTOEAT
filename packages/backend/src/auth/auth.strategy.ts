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

  validate(payload: any) {
    // PassportModule会自动给请求加上.user -> 参考user.controller.ts的getUserProfile
    return { userId: payload.sub, username: payload.username };
  }
}
