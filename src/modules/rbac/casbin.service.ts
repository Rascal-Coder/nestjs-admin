import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { newEnforcer, Enforcer } from "casbin";
import { PrismaService } from "@/prisma/prisma.service";
import {
  isCasbinRuleTableMissingError,
  PrismaCasbinAdapter,
} from "@/casbin/prisma-casbin-adapter";

/** 将 permission.code（如 user:read）拆为 Casbin 的 obj、act */
export function splitPermissionCode(code: string): {
  resource: string;
  action: string;
} {
  const i = code.indexOf(":");
  if (i <= 0 || i === code.length - 1) {
    throw new Error(`无效的权限码: ${code}`);
  }
  return { resource: code.slice(0, i), action: code.slice(i + 1) };
}

/** Casbin Enforcer 单例；策略变更后可调用 reloadPolicy（见 AGENTS.md） */
@Injectable()
export class CasbinService implements OnModuleInit {
  private readonly logger = new Logger(CasbinService.name);
  private enforcer!: Enforcer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const modelPath = this.config.getOrThrow<string>("casbin.modelPath");
    const adapter = new PrismaCasbinAdapter(this.prisma);
    this.enforcer = await newEnforcer(modelPath, adapter);
    try {
      await this.rebuildCasbinRulesFromPrisma();
    } catch (e) {
      if (isCasbinRuleTableMissingError(e)) {
        this.logger.warn(
          "数据库缺少 casbin_rule 表，已跳过 Casbin 策略同步；权限校验将以空策略为准。请执行 `pnpm prisma migrate deploy` 或 `pnpm prisma db push` 后再重启。",
        );
        return;
      }
      throw e;
    }
    this.logger.log("Casbin 策略已从数据库加载（p/g 已与 Prisma 对齐）");
  }

  /**
   * 用 Prisma 中的 user_roles、role_permissions 重写 casbin_rule 的 p 与 g，
   * 再 loadPolicy，避免仅「追加 g」导致 DB 与内存陈旧不一致。
   */
  async rebuildCasbinRulesFromPrisma(): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.casbinRule.deleteMany({
        where: { ptype: { in: ["p", "g"] } },
      });
      const userRoles = await tx.userRole.findMany({
        include: { role: true },
      });
      const gRows = userRoles.map((ur) => ({
        ptype: "g" as const,
        v0: ur.userId,
        v1: ur.role.code,
      }));
      const roles = await tx.role.findMany({
        include: { permissions: { include: { permission: true } } },
      });
      const pRows: {
        ptype: "p";
        v0: string;
        v1: string;
        v2: string;
      }[] = [];
      for (const role of roles) {
        for (const rp of role.permissions) {
          const { resource, action } = splitPermissionCode(rp.permission.code);
          pRows.push({
            ptype: "p",
            v0: role.code,
            v1: resource,
            v2: action,
          });
        }
      }
      if (gRows.length > 0) {
        await tx.casbinRule.createMany({ data: gRows });
      }
      if (pRows.length > 0) {
        await tx.casbinRule.createMany({ data: pRows });
      }
    });
    await this.enforcer.loadPolicy();
  }

  async enforce(
    userId: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    return this.enforcer.enforce(userId, resource, action);
  }

  /** 权限或角色数据变更后从 Prisma 重建 casbin_rule 并刷新内存 */
  async reloadPolicy(): Promise<void> {
    await this.rebuildCasbinRulesFromPrisma();
  }

  getEnforcer(): Enforcer {
    return this.enforcer;
  }
}
