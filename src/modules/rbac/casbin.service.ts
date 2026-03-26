import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { newEnforcer, Enforcer } from "casbin";
import { PrismaService } from "@/prisma/prisma.service";
import { PrismaCasbinAdapter } from "@/casbin/prisma-casbin-adapter";

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
    await this.enforcer.loadPolicy();
    await this.syncGroupingFromUserRoles();
    this.logger.log("Casbin 策略已从数据库加载");
  }

  /**
   * 将 Prisma user_roles 同步为 Casbin 的 g（用户→角色）。
   * 仅依赖 casbin_rule 时，若未跑 seed 或 g 与业务库不一致，会出现「管理员登录仍 403」。
   */
  private async syncGroupingFromUserRoles(): Promise<void> {
    const rows = await this.prisma.userRole.findMany({
      include: { role: true },
    });
    let added = 0;
    for (const ur of rows) {
      const ok = await this.enforcer.addGroupingPolicy(ur.userId, ur.role.code);
      if (ok) added += 1;
    }
    if (added > 0) {
      this.logger.log(
        `Casbin 已从 user_roles 补充 ${added} 条 g 策略（与 casbin_rule 合并）`,
      );
    }
  }

  async enforce(
    userId: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    return this.enforcer.enforce(userId, resource, action);
  }

  /** 权限或角色数据变更后刷新内存策略 */
  async reloadPolicy(): Promise<void> {
    await this.enforcer.loadPolicy();
    await this.syncGroupingFromUserRoles();
  }

  getEnforcer(): Enforcer {
    return this.enforcer;
  }
}
