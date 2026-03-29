/**
 * 种子数据（可重复执行）：
 * - roles / permissions / role_permissions：业务侧权限元数据
 * - users + user_roles：管理员账号与「用户↔角色」绑定（Casbin 启动时也会用 user_roles 补 g）
 * - casbin_rule：清空后写入 g（用户→角色）与 p（角色→资源/动作），与 RequirePermission 一致
 * - 菜单：仅初始化「系统管理 → 菜单管理」骨架（固定 id 幂等 upsert）并挂给 super_admin，其余请在后台维护
 *
 * RBAC 约定：
 * - super_admin（超管）：用户管理 + 存储 + 角色管理；唯一拥有 user:read / user:write、role:read / role:write
 * - admin（普通管理员）：仅 storage:write，不可访问用户管理 / 角色管理 API
 *
 * 环境变量：SEED_ADMIN_EMAIL、SEED_ADMIN_PASSWORD（见 .env.example）
 * 执行：pnpm prisma db seed
 * 执行后请重启 Nest，或调用 CasbinService.reloadPolicy（若已暴露）
 */
import "dotenv/config";
import * as bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import {
  MenuType,
  PrismaClient,
  RoleStatus,
  UserStatus,
} from "../src/generated/prisma/client";

const defaultUrl = "mysql://root:dev_root_password@127.0.0.1:3306/nestjs_admin";

const ROLE_SUPER_ADMIN = "super_admin";
const ROLE_ADMIN = "admin";

/** 种子菜单固定主键（可重复执行 seed 而不重复插入） */
const SEED_MENU_SYSTEM_ROOT_ID = "seed_menu_system_root";
const SEED_MENU_MANAGEMENT_ID = "seed_menu_management";

async function main() {
  const url = process.env.DATABASE_URL ?? defaultUrl;
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });

  const roleAdmin = await prisma.role.upsert({
    where: { code: ROLE_ADMIN },
    create: {
      code: ROLE_ADMIN,
      name: "管理员",
      status: RoleStatus.ACTIVE,
    },
    update: { status: RoleStatus.ACTIVE },
  });

  const roleSuperAdmin = await prisma.role.upsert({
    where: { code: ROLE_SUPER_ADMIN },
    create: {
      code: ROLE_SUPER_ADMIN,
      name: "超管",
      status: RoleStatus.ACTIVE,
    },
    update: { status: RoleStatus.ACTIVE },
  });

  const permStorageWrite = await prisma.permission.upsert({
    where: { code: "storage:write" },
    create: { code: "storage:write", name: "存储写入" },
    update: {},
  });

  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: roleAdmin.id,
        permissionId: permStorageWrite.id,
      },
    },
    create: { roleId: roleAdmin.id, permissionId: permStorageWrite.id },
    update: {},
  });
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: roleSuperAdmin.id,
        permissionId: permStorageWrite.id,
      },
    },
    create: { roleId: roleSuperAdmin.id, permissionId: permStorageWrite.id },
    update: {},
  });

  const permUserRead = await prisma.permission.upsert({
    where: { code: "user:read" },
    create: { code: "user:read", name: "用户管理-读取" },
    update: {},
  });
  const permUserWrite = await prisma.permission.upsert({
    where: { code: "user:write" },
    create: { code: "user:write", name: "用户管理-写入" },
    update: {},
  });

  // 用户管理权限仅挂在超管角色
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: roleSuperAdmin.id,
        permissionId: permUserRead.id,
      },
    },
    create: { roleId: roleSuperAdmin.id, permissionId: permUserRead.id },
    update: {},
  });
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: roleSuperAdmin.id,
        permissionId: permUserWrite.id,
      },
    },
    create: { roleId: roleSuperAdmin.id, permissionId: permUserWrite.id },
    update: {},
  });

  const permRoleRead = await prisma.permission.upsert({
    where: { code: "role:read" },
    create: { code: "role:read", name: "角色管理-读取" },
    update: {},
  });
  const permRoleWrite = await prisma.permission.upsert({
    where: { code: "role:write" },
    create: { code: "role:write", name: "角色管理-写入" },
    update: {},
  });
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: roleSuperAdmin.id,
        permissionId: permRoleRead.id,
      },
    },
    create: { roleId: roleSuperAdmin.id, permissionId: permRoleRead.id },
    update: {},
  });
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: roleSuperAdmin.id,
        permissionId: permRoleWrite.id,
      },
    },
    create: { roleId: roleSuperAdmin.id, permissionId: permRoleWrite.id },
    update: {},
  });

  const permMenuRead = await prisma.permission.upsert({
    where: { code: "menu:read" },
    create: { code: "menu:read", name: "菜单管理-读取" },
    update: {},
  });
  const permMenuWrite = await prisma.permission.upsert({
    where: { code: "menu:write" },
    create: { code: "menu:write", name: "菜单管理-写入" },
    update: {},
  });
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: roleSuperAdmin.id,
        permissionId: permMenuRead.id,
      },
    },
    create: { roleId: roleSuperAdmin.id, permissionId: permMenuRead.id },
    update: {},
  });
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: roleSuperAdmin.id,
        permissionId: permMenuWrite.id,
      },
    },
    create: { roleId: roleSuperAdmin.id, permissionId: permMenuWrite.id },
    update: {},
  });

  await prisma.menu.upsert({
    where: { id: SEED_MENU_SYSTEM_ROOT_ID },
    create: {
      id: SEED_MENU_SYSTEM_ROOT_ID,
      name: "系统管理",
      path: "/system",
      menuType: MenuType.DIRECTORY,
      sortOrder: 0,
      visible: true,
    },
    update: {
      name: "系统管理",
      path: "/system",
      menuType: MenuType.DIRECTORY,
      sortOrder: 0,
      visible: true,
    },
  });
  await prisma.menu.upsert({
    where: { id: SEED_MENU_MANAGEMENT_ID },
    create: {
      id: SEED_MENU_MANAGEMENT_ID,
      parentId: SEED_MENU_SYSTEM_ROOT_ID,
      name: "菜单管理",
      path: "/system/menu",
      permissionId: permMenuRead.id,
      menuType: MenuType.MENU,
      sortOrder: 0,
      visible: true,
    },
    update: {
      parentId: SEED_MENU_SYSTEM_ROOT_ID,
      name: "菜单管理",
      path: "/system/menu",
      permissionId: permMenuRead.id,
      menuType: MenuType.MENU,
      sortOrder: 0,
      visible: true,
    },
  });
  await prisma.roleMenu.upsert({
    where: {
      roleId_menuId: {
        roleId: roleSuperAdmin.id,
        menuId: SEED_MENU_SYSTEM_ROOT_ID,
      },
    },
    create: { roleId: roleSuperAdmin.id, menuId: SEED_MENU_SYSTEM_ROOT_ID },
    update: {},
  });
  await prisma.roleMenu.upsert({
    where: {
      roleId_menuId: {
        roleId: roleSuperAdmin.id,
        menuId: SEED_MENU_MANAGEMENT_ID,
      },
    },
    create: { roleId: roleSuperAdmin.id, menuId: SEED_MENU_MANAGEMENT_ID },
    update: {},
  });

  // 若历史上曾把用户管理权限赋给 admin，种子重复执行时移除
  await prisma.rolePermission.deleteMany({
    where: {
      roleId: roleAdmin.id,
      permissionId: {
        in: [
          permUserRead.id,
          permUserWrite.id,
          permRoleRead.id,
          permRoleWrite.id,
        ],
      },
    },
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin12345!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash,
      name: "系统管理员",
      roleCode: ROLE_SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
    update: {
      passwordHash,
      name: "系统管理员",
      roleCode: ROLE_SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: adminUser.id, roleId: roleSuperAdmin.id },
    },
    create: { userId: adminUser.id, roleId: roleSuperAdmin.id },
    update: {},
  });

  // 仅保留超管绑定，避免旧种子留下的 admin 分组导致权限歧义
  await prisma.userRole.deleteMany({
    where: {
      userId: adminUser.id,
      roleId: roleAdmin.id,
    },
  });

  await prisma.casbinRule.deleteMany();
  await prisma.casbinRule.createMany({
    data: [
      { ptype: "g", v0: adminUser.id, v1: roleSuperAdmin.code },
      { ptype: "p", v0: roleSuperAdmin.code, v1: "storage", v2: "write" },
      { ptype: "p", v0: roleSuperAdmin.code, v1: "user", v2: "read" },
      { ptype: "p", v0: roleSuperAdmin.code, v1: "user", v2: "write" },
      { ptype: "p", v0: roleSuperAdmin.code, v1: "role", v2: "read" },
      { ptype: "p", v0: roleSuperAdmin.code, v1: "role", v2: "write" },
      { ptype: "p", v0: roleSuperAdmin.code, v1: "menu", v2: "read" },
      { ptype: "p", v0: roleSuperAdmin.code, v1: "menu", v2: "write" },
      { ptype: "p", v0: roleAdmin.code, v1: "storage", v2: "write" },
    ],
  });

  console.log(
    `[seed] 完成：${adminEmail} 已绑定角色 ${ROLE_SUPER_ADMIN}（user_roles + role_code + casbin_rule），请重启 API`,
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
