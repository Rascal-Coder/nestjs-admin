/**
 * 种子数据（可重复执行）：
 * - roles / permissions / role_permissions：业务侧权限元数据
 * - users + user_roles：管理员账号与「用户↔admin」绑定（Casbin 启动时也会用 user_roles 补 g）
 * - casbin_rule：清空后写入 g（用户→角色）与 p（角色→资源/动作），与 RequirePermission 一致
 *
 * 环境变量：SEED_ADMIN_EMAIL、SEED_ADMIN_PASSWORD（见 .env.example）
 * 执行：pnpm prisma db seed
 * 执行后请重启 Nest，或调用 CasbinService.reloadPolicy（若已暴露）
 */
import "dotenv/config";
import * as bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { UserStatus } from "../src/generated/prisma/client";

const defaultUrl = "mysql://root:dev_root_password@127.0.0.1:3306/nestjs_admin";

async function main() {
  const url = process.env.DATABASE_URL ?? defaultUrl;
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });

  const adminRole = await prisma.role.upsert({
    where: { code: "admin" },
    create: { code: "admin", name: "管理员" },
    update: {},
  });

  const permStorageWrite = await prisma.permission.upsert({
    where: { code: "storage:write" },
    create: { code: "storage:write", name: "存储写入" },
    update: {},
  });

  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: adminRole.id,
        permissionId: permStorageWrite.id,
      },
    },
    create: { roleId: adminRole.id, permissionId: permStorageWrite.id },
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

  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: adminRole.id,
        permissionId: permUserRead.id,
      },
    },
    create: { roleId: adminRole.id, permissionId: permUserRead.id },
    update: {},
  });
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: adminRole.id,
        permissionId: permUserWrite.id,
      },
    },
    create: { roleId: adminRole.id, permissionId: permUserWrite.id },
    update: {},
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
      isAdmin: true,
      status: UserStatus.ACTIVE,
    },
    // 重复 seed 时同步密码与展示名，避免只改了库忘了脚本
    update: {
      passwordHash,
      name: "系统管理员",
      isAdmin: true,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: adminUser.id, roleId: adminRole.id },
    },
    create: { userId: adminUser.id, roleId: adminRole.id },
    update: {},
  });

  await prisma.casbinRule.deleteMany();
  await prisma.casbinRule.createMany({
    data: [
      { ptype: "g", v0: adminUser.id, v1: adminRole.code },
      { ptype: "p", v0: adminRole.code, v1: "storage", v2: "write" },
      { ptype: "p", v0: adminRole.code, v1: "user", v2: "read" },
      { ptype: "p", v0: adminRole.code, v1: "user", v2: "write" },
    ],
  });

  console.log(
    `[seed] 完成：管理员 ${adminEmail} 已绑定角色 admin（user_roles + casbin_rule），请重启 API`,
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
