# nestjs-admin

基于 **NestJS** 的管理后台 API：**Prisma 7**、**MySQL**、**Redis**、**MinIO**（S3 兼容）、**JWT**、**Casbin（RBAC）**。包管理使用 **pnpm**，本地依赖通过 **Docker Compose** 一键拉起。

更完整的分层约定、业务码与权限说明见仓库根目录 [`AGENTS.md`](./AGENTS.md)。

## 环境要求

- **Node.js** ≥ 20.19（Prisma 7 前置条件）
- **pnpm**（与 `package.json` 中 `packageManager` 字段一致）
- **Docker**（用于本地 MySQL / Redis / MinIO，可选但推荐）

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动基础设施（MySQL、Redis、MinIO）

在项目根目录执行：

```bash
docker compose up -d
```

默认映射端口与 `.env.example` 一致：MySQL `3306`、Redis `6379`、MinIO API `9000`、MinIO 控制台 `9001`。可通过环境变量 `MYSQL_PORT`、`REDIS_PORT`、`MINIO_API_PORT`、`MINIO_CONSOLE_PORT` 覆盖。

### 3. 配置环境变量

复制示例文件并按需修改：

```bash
cp .env.example .env
```

至少保证 `DATABASE_URL`、`REDIS_URL` 与 Compose 映射到本机的地址、端口一致（应用在**宿主机**跑时通常使用 `127.0.0.1`）。未配置 `.env` 时，Prisma CLI 会使用 [`prisma.config.ts`](./prisma.config.ts) 中的默认连接串（仅作占位，生产环境务必用 `.env` 覆盖）。

### 4. 生成 Prisma Client、**迁库**与种子

**应用启动不会自动建表。** `schema.prisma` 只描述「应该有哪些表」，真正在 MySQL 里创建/变更表结构的是下面这一步；跳过则接口会报 Prisma **P2021**（表不存在）等问题。

| 步骤 | 作用 |
| ---- | ---- |
| `pnpm prisma:generate` | 根据 schema 生成 Prisma Client |
| `pnpm prisma:migrate` 或 `pnpm prisma:push` | **在数据库中创建/同步表结构**（首次必须成功执行一次） |
| `pnpm prisma:seed` | 在已有表的前提下写入种子数据（如超管），**不能代替迁库** |

首次迁库（本机开发）：

```bash
pnpm prisma:generate
pnpm prisma:migrate
```

若命令行询问迁移名称，输入例如 `init` 后回车；或一次写完、避免交互：

```bash
pnpm exec prisma migrate dev --name init
```

无 `prisma/migrations`、仅有 schema 的新仓库：同样用上面命令生成**第一条**迁移并应用。临时不想维护迁移文件时，可用 `pnpm prisma:push` 把 schema 推到当前库（适合个人本地，团队协作更推荐 `migrate`）。

迁库成功后再执行种子（按需）：

```bash
pnpm prisma:seed
```

### 5. 启动应用

开发模式（热重载）：

```bash
pnpm start:dev
```

生产构建与运行：

```bash
pnpm build
pnpm start:prod
```

## 常见问题

- **Prisma P2021（某张表不存在）或业务返回失败、日志里出现 `does not exist in the current database`**：多半是**还没迁库**或 **`DATABASE_URL` 指到了空库/错库**。按上文第 4 步执行 `pnpm prisma:migrate`（或 `pnpm prisma:push`），需要演示账号时再 `pnpm prisma:seed`。

## 访问地址

| 说明 | 地址（默认） |
| ---- | ------------ |
| HTTP API | `http://127.0.0.1:8000/api`（前缀由 `API_PREFIX` 控制，默认 `api`） |
| Swagger（非 `production`） | `http://127.0.0.1:8000/docs` |

`PORT` 默认 `8000`，可在 `.env` 中修改。

## 常用脚本

| 命令 | 说明 |
| ---- | ---- |
| `pnpm start:dev` | 开发模式 |
| `pnpm start:debug` | 开发 + 调试 |
| `pnpm build` | 编译 |
| `pnpm start:prod` | 运行 `dist/main` |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier 格式化 `src/**/*.ts` |
| `pnpm prisma:generate` | 生成 Prisma Client |
| `pnpm prisma:migrate` | 开发迁移（`prisma migrate dev`）；**首次 clone / 新库必须先执行**，再在库里建表 |
| `pnpm prisma:push` | 将 schema 推送到数据库（无迁移文件时使用） |
| `pnpm prisma:seed` | 执行种子 `prisma/seed.ts` |

## 环境变量摘要

完整占位见 [`.env.example`](./.env.example)。常见项：

- **应用**：`NODE_ENV`、`PORT`、`API_PREFIX`
- **数据库**：`DATABASE_URL`（MySQL，与 Prisma / `prisma.config.ts` 一致）
- **Redis**：`REDIS_URL`
- **MinIO**：`MINIO_ENDPOINT`、`MINIO_ACCESS_KEY`、`MINIO_SECRET_KEY`、`MINIO_BUCKET` 等
- **JWT**：`JWT_SECRET`、`JWT_EXPIRES_IN`、`JWT_REFRESH_SECRET`、`JWT_REFRESH_EXPIRES_IN`
- **Casbin**：`CASBIN_MODEL_PATH`（默认 `src/casbin/model.conf`）
- **种子（可选）**：`SEED_ADMIN_EMAIL`、`SEED_ADMIN_PASSWORD`

**请勿**将真实密钥提交到仓库；生产环境务必更换 JWT 与数据库口令。


