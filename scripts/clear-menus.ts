/**
 * 运维脚本：清空 role_menus 与 menus。
 * 执行：pnpm exec tsx scripts/clear-menus.ts
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

const defaultUrl =
  "mysql://root:dev_root_password@127.0.0.1:3306/nestjs_admin";

async function main() {
  const url = process.env.DATABASE_URL ?? defaultUrl;
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });
  const r1 = await prisma.roleMenu.deleteMany({});
  const r2 = await prisma.menu.deleteMany({});
  console.log("cleared role_menus:", r1.count, "menus:", r2.count);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
