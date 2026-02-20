import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthUser } from 'src/auth/auth.strategy';
import { Request } from 'express';

export type AuthRequest = Request & {
  user: AuthUser;
};

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const reqRaw = context.switchToHttp().getRequest<AuthRequest>();
    if (!reqRaw.user) return false;
    if (reqRaw.user.isAdmin === true) return true;
    return false; // default deny
  }
}
