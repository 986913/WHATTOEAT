import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { GoogleAuthUser } from 'src/auth/google.strategy';

export type GoogleAuthRequest = Request & {
  user: GoogleAuthUser;
};

export class GoogleAuthGuard extends AuthGuard('google') {
  constructor() {
    super();
  }
}
