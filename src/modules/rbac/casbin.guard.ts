import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { BusinessCode } from "@/common/constants/business-code";
import {
  CasbinPermissionMeta,
  PERMISSION_KEY,
} from "@/common/decorators/require-permission.decorator";
import { BusinessException } from "@/common/exceptions/business.exception";
import type { JwtPayload } from "@/modules/auth/interfaces/jwt-payload.interface";
import { CasbinService } from "./casbin.service";

@Injectable()
export class CasbinGuard implements CanActivate {
  private readonly logger = new Logger(CasbinGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly casbin: CasbinService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const perm = this.reflector.getAllAndOverride<
      CasbinPermissionMeta | undefined
    >(PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    if (!perm) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = req.user;
    if (!user?.sub) {
      throw new BusinessException(
        BusinessCode.UNAUTHORIZED,
        "未登录",
        HttpStatus.UNAUTHORIZED,
      );
    }

    const allowed = await this.casbin.enforce(
      user.sub,
      perm.resource,
      perm.action,
    );
    if (!allowed) {
      this.logger.warn(
        `Casbin 拒绝: sub=${user.sub} resource=${perm.resource} action=${perm.action}`,
      );
      throw new BusinessException(
        BusinessCode.FORBIDDEN,
        "无权限",
        HttpStatus.FORBIDDEN,
      );
    }
    return true;
  }
}
