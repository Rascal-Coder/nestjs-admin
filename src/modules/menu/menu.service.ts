import { HttpStatus, Injectable } from "@nestjs/common";
import { MenuType, type Prisma } from "@/generated/prisma/client";
import { BusinessCode } from "@/common/constants/business-code";
import { BusinessException } from "@/common/exceptions/business.exception";
import { PrismaService } from "@/prisma/prisma.service";
import type { CreateMenuDto } from "./dto/create-menu.dto";
import type { UpdateMenuDto } from "./dto/update-menu.dto";

/** 与 Prisma schema `MenuType` 枚举取值一致（避免从生成文件导入类型时 ESLint 报 error） */
export type MenuTypeLiteral = "DIRECTORY" | "MENU" | "BUTTON";

/** 与 Permission 表字段对齐的快照（菜单树节点上仅需展示这些） */
export type MenuPermissionSnapshot = {
  id: string;
  code: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * 菜单树查询行：与 `findMany({ include: { permission: true } })` 一致。
 * 使用显式结构而非 `Prisma.MenuGetPayload`，避免生成客户端在严格 ESLint 下被推断为 error 类型。
 */
export type MenuTreeRow = {
  id: string;
  parentId: string | null;
  name: string;
  path: string | null;
  activePath: string | null;
  redirect: string | null;
  permissionId: string | null;
  sortOrder: number;
  menuType: MenuTypeLiteral;
  visible: boolean;
  icon: string | null;
  createdAt: Date;
  updatedAt: Date;
  permission: MenuPermissionSnapshot | null;
};

/** 菜单树节点（递归；供控制器与 OpenAPI 描述） */
export type MenuTreeNode = {
  id: string;
  parentId: string | null;
  name: string;
  path: string | null;
  activePath: string | null;
  redirect: string | null;
  menuType: MenuTypeLiteral;
  sortOrder: number;
  visible: boolean;
  icon: string | null;
  permission: MenuPermissionSnapshot | null;
  children: MenuTreeNode[];
};

/** 菜单详情（扁平，无 children） */
export type MenuDetail = Omit<MenuTreeNode, "children"> & {
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  /** 菜单树（parentId 为 null 为根） */
  async getTree(): Promise<{ items: MenuTreeNode[] }> {
    const rows = (await this.prisma.menu.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: { permission: true },
    })) as MenuTreeRow[];

    return { items: this.buildForest(rows) };
  }

  async findByIdOrThrow(id: string): Promise<MenuDetail> {
    const row = (await this.prisma.menu.findUnique({
      where: { id },
      include: { permission: true },
    })) as MenuTreeRow | null;
    if (!row) {
      throw new BusinessException(
        BusinessCode.NOT_FOUND,
        "菜单不存在",
        HttpStatus.NOT_FOUND,
      );
    }
    return this.rowToDetail(row);
  }

  async create(dto: CreateMenuDto): Promise<MenuDetail> {
    const parentId = dto.parentId ?? null;
    if (parentId) {
      const parent = await this.prisma.menu.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        throw new BusinessException(
          BusinessCode.NOT_FOUND,
          "父级菜单不存在",
          HttpStatus.NOT_FOUND,
        );
      }
    }
    if (dto.permissionId) {
      await this.assertPermissionExists(dto.permissionId);
    }

    const row = (await this.prisma.menu.create({
      data: {
        parentId,
        name: dto.name,
        path: dto.path ?? null,
        activePath: dto.activePath ?? null,
        redirect: (dto.redirect ?? null) as string | null,
        permissionId: dto.permissionId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        menuType: dto.menuType ?? MenuType.MENU,
        visible: dto.visible ?? true,
        icon: dto.icon ?? null,
      },
      include: { permission: true },
    })) as MenuTreeRow;

    return this.rowToDetail(row);
  }

  async updateById(id: string, dto: UpdateMenuDto): Promise<MenuDetail> {
    const existing = await this.prisma.menu.findUnique({ where: { id } });
    if (!existing) {
      throw new BusinessException(
        BusinessCode.NOT_FOUND,
        "菜单不存在",
        HttpStatus.NOT_FOUND,
      );
    }

    const nextParentId =
      dto.parentId !== undefined ? (dto.parentId ?? null) : undefined;
    if (nextParentId !== undefined) {
      await this.assertValidParent(id, nextParentId);
    }
    if (dto.permissionId !== undefined && dto.permissionId !== null) {
      await this.assertPermissionExists(dto.permissionId);
    }

    const data: Prisma.MenuUncheckedUpdateInput = {};
    if (nextParentId !== undefined) {
      data.parentId = nextParentId;
    }
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.path !== undefined) {
      data.path = dto.path;
    }
    if (dto.activePath !== undefined) {
      data.activePath = dto.activePath;
    }
    if (dto.redirect !== undefined) {
      data.redirect = dto.redirect as string | null;
    }
    if (dto.permissionId !== undefined) {
      data.permissionId = dto.permissionId;
    }
    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }
    if (dto.menuType !== undefined) {
      data.menuType = dto.menuType;
    }
    if (dto.visible !== undefined) {
      data.visible = dto.visible;
    }
    if (dto.icon !== undefined) {
      data.icon = dto.icon;
    }

    const row = (await this.prisma.menu.update({
      where: { id },
      data,
      include: { permission: true },
    })) as MenuTreeRow;

    return this.rowToDetail(row);
  }

  async removeById(id: string): Promise<void> {
    const existing = await this.prisma.menu.findUnique({ where: { id } });
    if (!existing) {
      throw new BusinessException(
        BusinessCode.NOT_FOUND,
        "菜单不存在",
        HttpStatus.NOT_FOUND,
      );
    }
    await this.prisma.menu.delete({ where: { id } });
  }

  private rowToDetail(row: MenuTreeRow): MenuDetail {
    return {
      id: row.id,
      parentId: row.parentId,
      name: row.name,
      path: row.path,
      activePath: row.activePath,
      redirect: row.redirect,
      menuType: row.menuType,
      sortOrder: row.sortOrder,
      visible: row.visible,
      icon: row.icon,
      permission: row.permission,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async assertPermissionExists(permissionId: string): Promise<void> {
    const p = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });
    if (!p) {
      throw new BusinessException(
        BusinessCode.NOT_FOUND,
        "权限不存在",
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /** 父级不能为自身或当前菜单的任意子孙节点 */
  private async assertValidParent(
    menuId: string,
    newParentId: string | null,
  ): Promise<void> {
    if (newParentId === null) {
      return;
    }
    if (newParentId === menuId) {
      throw new BusinessException(
        BusinessCode.BAD_REQUEST,
        "父级菜单不能为当前菜单自身",
        HttpStatus.BAD_REQUEST,
      );
    }
    const parent = await this.prisma.menu.findUnique({
      where: { id: newParentId },
    });
    if (!parent) {
      throw new BusinessException(
        BusinessCode.NOT_FOUND,
        "父级菜单不存在",
        HttpStatus.NOT_FOUND,
      );
    }
    const descendants = await this.collectDescendantIds(menuId);
    if (descendants.has(newParentId)) {
      throw new BusinessException(
        BusinessCode.BAD_REQUEST,
        "父级菜单不能为当前菜单的子节点",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async collectDescendantIds(rootId: string): Promise<Set<string>> {
    const known = new Set<string>();
    const queue = [rootId];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const children = await this.prisma.menu.findMany({
        where: { parentId: cur },
        select: { id: true },
      });
      for (const c of children) {
        if (!known.has(c.id)) {
          known.add(c.id);
          queue.push(c.id);
        }
      }
    }
    return known;
  }

  private buildForest(rows: MenuTreeRow[]): MenuTreeNode[] {
    const byParent = new Map<string | null, MenuTreeRow[]>();
    for (const row of rows) {
      const parentId = row.parentId ?? null;
      const siblings = byParent.get(parentId) ?? [];
      siblings.push(row);
      byParent.set(parentId, siblings);
    }
    for (const list of byParent.values()) {
      list.sort(
        (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
      );
    }
    const roots = byParent.get(null) ?? [];

    const toNode = (m: MenuTreeRow): MenuTreeNode => ({
      id: m.id,
      parentId: m.parentId,
      name: m.name,
      path: m.path,
      activePath: m.activePath,
      redirect: m.redirect,
      menuType: m.menuType,
      sortOrder: m.sortOrder,
      visible: m.visible,
      icon: m.icon,
      permission: m.permission,
      children: (byParent.get(m.id) ?? []).map(toNode),
    });

    return roots.map(toNode);
  }
}
