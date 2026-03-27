import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma, RoleStatus } from "@/generated/prisma/client";
import { BusinessCode } from "@/common/constants/business-code";
import { BusinessException } from "@/common/exceptions/business.exception";
import { CasbinService } from "@/modules/rbac/casbin.service";
import { PrismaService } from "@/prisma/prisma.service";
import type { CreateRoleDto } from "./dto/create-role.dto";
import type { UpdateRoleDto } from "./dto/update-role.dto";
import type { UpdateRolePermissionsDto } from "./dto/update-role-permissions.dto";

/** 种子/系统内置角色，禁止删除以免破坏权限模型 */
const RESERVED_ROLE_CODES = new Set(["super_admin", "admin"]);

const roleInclude = {
  permissions: { include: { permission: true } },
  menus: true,
} satisfies Prisma.RoleInclude;

export type RoleWithPermissions = Prisma.RoleGetPayload<{
  include: typeof roleInclude;
}>;

@Injectable()
export class RoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly casbin: CasbinService,
  ) {}

  async listAllPermissions() {
    const rows = await this.prisma.permission.findMany({
      orderBy: { code: "asc" },
    });
    return {
      items: rows.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    };
  }

  async listPaginated(page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const [rows, total] = await Promise.all([
      this.prisma.role.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: roleInclude,
      }),
      this.prisma.role.count(),
    ]);
    return {
      items: rows.map((r) => this.mapRole(r)),
      total,
    };
  }

  async findByIdOrThrow(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: roleInclude,
    });
    if (!role) {
      throw new BusinessException(
        BusinessCode.NOT_FOUND,
        "角色不存在",
        HttpStatus.NOT_FOUND,
      );
    }
    return this.mapRole(role);
  }

  async create(dto: CreateRoleDto) {
    const exists = await this.prisma.role.findUnique({
      where: { code: dto.code },
    });
    if (exists) {
      throw new BusinessException(
        BusinessCode.CONFLICT,
        "角色 code 已存在",
        HttpStatus.CONFLICT,
      );
    }
    const menuIds = dto.menuIds ?? [];
    const created = await this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          code: dto.code,
          name: dto.name,
          status: dto.status ?? RoleStatus.ACTIVE,
          remark: dto.remark ?? null,
        },
      });
      await this.replaceRoleMenusAndSyncPermissions(tx, role.id, menuIds);
      return tx.role.findUniqueOrThrow({
        where: { id: role.id },
        include: roleInclude,
      });
    });
    await this.casbin.rebuildCasbinRulesFromPrisma();
    return this.mapRole(created);
  }

  async updateById(id: string, dto: UpdateRoleDto) {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new BusinessException(
        BusinessCode.NOT_FOUND,
        "角色不存在",
        HttpStatus.NOT_FOUND,
      );
    }
    const noop =
      dto.name === undefined &&
      dto.status === undefined &&
      dto.remark === undefined &&
      dto.menuIds === undefined;
    if (noop) {
      return this.findByIdOrThrow(id);
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.RoleUpdateInput = {};
      if (dto.name !== undefined) data.name = dto.name;
      if (dto.status !== undefined) data.status = dto.status;
      if (dto.remark !== undefined) data.remark = dto.remark;
      if (Object.keys(data).length > 0) {
        await tx.role.update({ where: { id }, data });
      }
      if (dto.menuIds !== undefined) {
        await this.replaceRoleMenusAndSyncPermissions(tx, id, dto.menuIds);
      }
      return tx.role.findUniqueOrThrow({
        where: { id },
        include: roleInclude,
      });
    });
    if (dto.menuIds !== undefined) {
      await this.casbin.rebuildCasbinRulesFromPrisma();
    }
    return this.mapRole(updated);
  }

  async removeById(id: string) {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new BusinessException(
        BusinessCode.NOT_FOUND,
        "角色不存在",
        HttpStatus.NOT_FOUND,
      );
    }
    if (RESERVED_ROLE_CODES.has(existing.code)) {
      throw new BusinessException(
        BusinessCode.FORBIDDEN,
        "系统内置角色不可删除",
        HttpStatus.FORBIDDEN,
      );
    }
    await this.prisma.role.delete({ where: { id } });
    await this.casbin.rebuildCasbinRulesFromPrisma();
  }

  async replacePermissions(id: string, dto: UpdateRolePermissionsDto) {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new BusinessException(
        BusinessCode.NOT_FOUND,
        "角色不存在",
        HttpStatus.NOT_FOUND,
      );
    }
    const uniqueIds = [...new Set(dto.permissionIds)];
    await this.prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { roleId: id } });
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      if (uniqueIds.length === 0) {
        return;
      }
      const count = await tx.permission.count({
        where: { id: { in: uniqueIds } },
      });
      if (count !== uniqueIds.length) {
        throw new BusinessException(
          BusinessCode.BAD_REQUEST,
          "存在无效的 permissionId",
          HttpStatus.BAD_REQUEST,
        );
      }
      await tx.rolePermission.createMany({
        data: uniqueIds.map((permissionId) => ({ roleId: id, permissionId })),
      });
    });
    await this.casbin.rebuildCasbinRulesFromPrisma();
    return this.findByIdOrThrow(id);
  }

  /** 写入 role_menus，并按勾选菜单上的 permissionId 重建 role_permissions */
  private async replaceRoleMenusAndSyncPermissions(
    tx: Prisma.TransactionClient,
    roleId: string,
    menuIds: string[],
  ): Promise<void> {
    const unique = [...new Set(menuIds)];
    await tx.roleMenu.deleteMany({ where: { roleId } });
    await tx.rolePermission.deleteMany({ where: { roleId } });
    if (unique.length === 0) {
      return;
    }
    const n = await tx.menu.count({ where: { id: { in: unique } } });
    if (n !== unique.length) {
      throw new BusinessException(
        BusinessCode.BAD_REQUEST,
        "存在无效的 menuId",
        HttpStatus.BAD_REQUEST,
      );
    }
    await tx.roleMenu.createMany({
      data: unique.map((menuId) => ({ roleId, menuId })),
    });
    const menus = await tx.menu.findMany({
      where: { id: { in: unique } },
      select: { permissionId: true },
    });
    const permIds = [
      ...new Set(
        menus
          .map((m) => m.permissionId)
          .filter((x): x is string => Boolean(x)),
      ),
    ];
    if (permIds.length === 0) {
      return;
    }
    await tx.rolePermission.createMany({
      data: permIds.map((permissionId) => ({ roleId, permissionId })),
    });
  }

  private mapRole(role: RoleWithPermissions) {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      status: role.status,
      remark: role.remark,
      menuIds: role.menus.map((rm) => rm.menuId),
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        name: rp.permission.name,
        createdAt: rp.permission.createdAt,
        updatedAt: rp.permission.updatedAt,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
