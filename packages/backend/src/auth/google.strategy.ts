import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { ConfigEnum } from 'src/enum/config.enum';

export interface GoogleAuthUser {
  googleId: string;
  displayName: string;
  email?: string;
  photo?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly cfgService: ConfigService) {
    super({
      clientID: cfgService.get<string>(ConfigEnum.GOOGLE_CLIENT_ID)!,
      clientSecret: cfgService.get<string>(ConfigEnum.GOOGLE_CLIENT_SECRET)!,
      callbackURL: cfgService.get<string>(ConfigEnum.GOOGLE_CALLBACK_URL)!,
      scope: ['email', 'profile'],
    });
  }

  /**
   * validate 在 Google OAuth 回调时，passport 用 authorization code 换取 token 后自动调用,
   * 也就通过了 @UseGuards(AuthGuard('google'))
   * 其中参数 profile 是 passport 用 accessToken 从 Google 获取的用户信息
   * 其返回的对象（通过 done 回调）会挂载到 req.user
   */
  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const { id, displayName, emails, photos } = profile;
    const user: GoogleAuthUser = {
      googleId: id,
      email: emails?.[0]?.value,
      displayName,
      photo: photos?.[0]?.value,
    };
    done(null, user);
  }
}
