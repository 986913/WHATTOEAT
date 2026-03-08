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
