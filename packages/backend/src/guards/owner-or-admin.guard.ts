import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthRequest } from './admin.guard';

/**
 * 只允许「本人」或「管理员」通过
 * 要求路由参数中含 :id，且 JwtAuthenticationGuard 已先执行
 */
@Injectable()
export class OwnerOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    if (!req.user) return false;

    const paramId = Number(req.params.id);
    // 本人 或 管理员 放行
    return req.user.userID === paramId || req.user.isAdmin === true;
  }
}
