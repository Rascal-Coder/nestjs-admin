import "dotenv/config";
import { defineConfig } from "prisma/config";

/** 无 .env 时给 CLI（generate 等）占位，本地开发请用 .env 覆盖 */
const defaultMysqlUrl =
  "mysql://root:dev_root_password@127.0.0.1:3306/nestjs_admin";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? defaultMysqlUrl,
  },
});
