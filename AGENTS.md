# AGENTS.md

供 AI 助手与协作者参考：**技术栈、分层约定、HTTP/业务码、鉴权与权限**。用户侧安装与运行说明放在 `README.md`；细节设计可放在 `/docs`。

**技术栈一览：** NestJS · TypeScript（严格）· **Prisma 7** · MySQL · Redis · MinIO · JWT · Casbin（RBAC）· **pnpm** · **Docker Compose**

---

## 目录

- [AGENTS.md](#agentsmd)
  - [目录](#目录)
  - [技术栈](#技术栈)
  - [包管理与 Prisma 7](#包管理与-prisma-7)
  - [Docker Compose](#docker-compose)
  - [分层与模块](#分层与模块)
  - [HTTP 与拦截](#http-与拦截)
  - [业务码约定](#业务码约定)
  - [鉴权与权限 RBAC](#鉴权与权限-rbac)
  - [数据与缓存](#数据与缓存)
  - [文件存储 MinIO](#文件存储-minio)
  - [环境变量](#环境变量)
  - [代码风格](#代码风格)
  - [Agent 检查清单](#agent-检查清单)

---

## 技术栈

| 层级 | 选型 | 说明 |
| ---- | ---- | ---- |
| 运行时 | Node.js + NestJS | Node 建议 **≥ 20.19**（Prisma 7 前置条件）；模块化、依赖注入、与拦截器/守卫天然契合 |
| 语言 | TypeScript `strict` | 公共 API 显式返回类型 |
| 包管理 | **pnpm** | 与仓库 `packageManager` 字段一致；依赖与脚本统一用 `pnpm`，勿混用 npm/yarn |
| ORM | **Prisma 7.x** | `prisma` 与 `@prisma/client` 版本对齐；Schema 即契约；配置入口 **`prisma.config.ts`**；迁移与 CLI 见下节 |
| 数据库 | MySQL | 生产连接池、事务在 Service 层显式控制 |
| 缓存 | Redis | 会话黑名单、限流、热点数据、分布式锁（按需） |
| 对象存储 | MinIO（S3 兼容） | 预签名上传/下载，业务仅存 `bucket + key + meta` |
| 鉴权 | JWT（Access / Refresh 按项目定） | HttpOnly Cookie 或 Authorization Bearer 与前端约定一致 |
| 权限模型 | RBAC + Casbin | 角色/权限与路由或资源标识绑定，策略可版本化 |
| 本地/交付基础设施 | **Docker Compose** | 仓库**必须**维护 Compose 定义，统一拉起依赖服务（见下节） |

---

## 包管理与 Prisma 7

**包管理（默认 pnpm）**

- 安装依赖：`pnpm add <pkg>`；开发依赖：`pnpm add -D <pkg>`。
- 执行脚本：`pnpm run <script>` 或 `pnpm <script>`（若与内置命令不冲突）。
- 勿提交 `pnpm-lock.yaml` 以外的锁文件混用；monorepo 子包同样以 pnpm workspace 为准。

**Prisma 7 与本项目约定（摘要）**

- 使用 **`prisma@7`** 与 **`@prisma/client@7`** 同步升级；v7 以 **driver adapter** 连库（MySQL 常用 `@prisma/adapter-mysql2` + `mysql2`），在 `PrismaService` 中 `new PrismaClient({ adapter })`。
- CLI 与 schema：根目录维护 **`prisma.config.ts`**（数据源 URL 等）；`schema.prisma` 中 generator 使用 `provider = "prisma-client"` 且 **`output` 必填**，Client 从该路径引用（勿默认假设 `@prisma/client` 路径，以项目为准）。
- **v7 与 v6 差异**：`migrate dev` / `db push` **不会**自动执行 `generate`——改 schema 后需显式 **`pnpm prisma generate`**；种子需显式 **`pnpm prisma db seed`**；`$use` 中间件已移除，请用 **Client Extensions**。
- 更细的 schema、ESM/CJS、Accelerate、安全 CLI 等说明见 **`.cursor/rules/prisma-orm-v7.mdc`**。

---

## Docker Compose

本项目**要求**在仓库中提供 **Docker Compose** 编排（文件名常用 `docker-compose.yml` 或 `compose.yaml`，与团队统一即可），用于本地开发与协作环境**一键启动**后端所依赖的基础设施，避免「每人装一套 MySQL/Redis/MinIO」的摩擦。

**范围与内容**

- 至少覆盖与本栈相关的依赖：**MySQL**、**Redis**、**MinIO**（端口、卷、服务名与 `DATABASE_URL` / `REDIS_URL` / MinIO 相关环境变量保持一致）。
- 建议为数据库等配置 **healthcheck**，应用或迁移脚本待依赖就绪后再连（或在 README 中说明启动顺序）。
- **密钥与凭据**：Compose 中可使用变量占位；真实密钥走本地 **`.env`**（已 `.gitignore`），仓库只维护 **`.env.example`** 中的占位说明与与 Compose 对齐的主机/端口。

**与运行方式的关系**

- 常见模式：Compose 只负责 **基础设施**，Nest 应用仍在宿主机用 **`pnpm`** 开发与调试（端口与容器映射一致即可）。若团队选择在 Compose 内同时运行 API 镜像，需在文档中单独说明构建与挂载约定。

**文档与命令**

- `README.md` 中应写明如何启动依赖（例如 **`docker compose up -d`**；旧版 CLI 为 `docker-compose`，按本机安装为准）。
- 新增或变更某依赖服务（端口、卷、环境变量名）时，**同步**更新 Compose、`.env.example` 与相关说明。

---

## 分层与模块

建议目录（可按实际微调，但保持职责清晰）：

```
src/
├── main.ts
├── app.module.ts
├── common/                 # 全局：过滤器、拦截器、装饰器、DTO 基类、业务异常
├── config/                 # 配置模块（ Joi / zod 校验 env）
├── prisma/                 # PrismaService、迁移与 seed
├── modules/
│   ├── auth/               # 登录、刷新令牌、JWT 策略
│   ├── user/               # 用户领域
│   ├── rbac/               # 角色、权限、Casbin 同步（DB → enforcer）
│   └── storage/            # MinIO 封装、预签名 URL
└── casbin/                 # model.conf、adapter（如 prisma-adapter）
```

分层与模块解耦：

- **分层**：Controller 宜弱（校验、鉴权、编排）；业务规则放在 Service；数据库读写只经 Repository / Prisma，不在 Controller 里堆判断。
- **跨模块**：优先依赖 **抽象接口**（依赖倒置，调用方不绑具体实现），或用 **领域事件**：把协作表述为「某业务事实已发生」（例：用户已创建），由监听方自行处理，从而少用「A 直接注入 B、B 又依赖 A」式的双向引用，避免循环依赖。

---

## HTTP 与拦截

「完整的 HTTP 拦截」指：**请求进入与响应离开链路可观测、可统一塑形**，并与业务语义分离。

| 组件 | 职责 |
| ---- | ---- |
| **全局异常过滤器** | 将 `HttpException`、Prisma 错误、未知错误映射为统一 JSON；记录 `requestId`、路径、状态码；生产环境不泄露堆栈 |
| **日志/请求 ID 拦截器** | 生成或透传 `X-Request-Id`；记录耗时、方法、URL、用户标识（脱敏） |
| **序列化拦截器** | 统一成功体结构（见下节「业务码」）；过滤敏感字段（`@Exclude()` + `class-transformer`） |
| **验证管道** | 全局 `ValidationPipe`：`whitelist`、`forbidNonWhitelisted`、`transform` |

业务错误优先抛 **自定义业务异常**（携带业务码），由过滤器映射为 HTTP 状态 + 统一 body，避免在 Controller 里手写多种响应形状。

---

## 业务码约定

「业务码拦截」指：**除 HTTP 状态外，客户端依赖稳定 `code` 区分场景**（尤其 200 但业务失败时）。

建议约定（可按项目枚举表实现）：

- `0`：成功（或与 HTTP 2xx 搭配的唯一成功码，团队二选一并全局一致）。
- `1xxxx`：通用/参数/鉴权类（如 10001 未登录、10003 无权限）。
- `2xxxx`：领域模块划分（如用户 20xxx、订单 21xxx）。

响应体形状示例（仅供对齐，字段名可项目统一）：

```json
{
  "success": true,
  "code": 0,
  "message": "ok",
  "data": {},
  "requestId": "uuid"
}
```

失败时 `success: false`，`code` 为非 0，`message` 给用户可读文案；**日志中记录内部原因与堆栈**，响应体不暴露实现细节。

---

## 鉴权与权限 RBAC

| 概念 | 实现要点 |
| ---- | -------- |
| **认证** | JWT 校验（`Authorization` 或 Cookie）；刷新令牌轮换；登出可将 jti 写入 Redis 黑名单（若 token 无 jti 则缩短 access 有效期） |
| **用户上下文** | 守卫解析 JWT 后注入 `req.user`（id、角色列表等） |
| **RBAC** | Prisma 中 `User` ↔ `Role` ↔ `Permission`（或 Casbin 完全管理策略，二选一并文档化） |
| **Casbin** | `model.conf` 定义 `sub, obj, act`；Adapter 与 DB 同步；**权限变更后**调用 `enforcer.loadPolicy()` 或等价刷新 |
| **与路由结合** | 使用装饰器声明所需权限，守卫内 `enforcer.enforce(userId, resource, action)` |

注意：Casbin 的 `sub` 与 JWT 中的 subject 字段名不要混用概念——建议统一用用户 ID 或业务用户主键作为 subject。

---

## 数据与缓存

- **Prisma 7**：单例 `PrismaService`，通过 **driver adapter** 注入客户端；在 `onModuleInit` 连接；优雅关闭时 `$disconnect`。不在 API 层暴露原始 Client。
- **事务**：多表写操作使用 `prisma.$transaction`；避免长事务。
- **Redis**：键名加前缀（如 `nest-admin:`）；为缓存设置 TTL；防缓存击穿可用互斥或短期空值缓存（按业务需要）。

---

## 文件存储 MinIO

- 上传：**预签名 PUT** 直传 MinIO，后端只颁发 URL 与校验策略；或经后端流式上传（小文件）。
- 元数据：数据库保存 `objectKey`、`mime`、`size`、`etag`、业务外键；**禁止**把 MinIO 内网地址直接暴露给前端下载，下载用**短期预签名 GET**。
- 权限：Bucket 私有；删除对象与 DB 记录在同一事务或补偿任务中保持一致。

---

## 环境变量

建议使用 `env` 校验（启动失败即报错），典型变量（名称可按项目统一）：

| 变量 | 说明 |
| ---- | ---- |
| `DATABASE_URL` | MySQL Prisma 连接串 |
| `REDIS_URL` | Redis |
| `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_BUCKET` | MinIO |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | JWT |
| `CASBIN_MODEL_PATH` | Casbin 模型文件路径 |

勿将密钥提交到仓库；`.env.example` 仅含占位符。Prisma 7 若需在 CLI 外加载 `.env`，在 `prisma.config.ts` 或应用入口按团队约定显式加载（见 `prisma-orm-v7.mdc`）。

使用 **Docker Compose** 时，`DATABASE_URL` / `REDIS_URL` 等中的主机名应与 Compose **服务名**或映射到宿主机的 **端口**一致（应用在宿主机跑常用 `127.0.0.1` + 映射端口；应用在 Compose 网络内跑则用服务名）。

---

## 代码风格

- ESLint + Prettier 与 monorepo 根配置对齐（若有）。
- **包管理**：默认 **pnpm**（见上文「包管理与 Prisma 7」）。
- **基础设施**：依赖服务通过 **Docker Compose** 编排（见「Docker Compose」）；与手动安装二选一时以仓库 Compose 为准。
- **中文**：用户可见错误消息、日志文案可用中文；代码标识符保持英文。
- 新增模块时同步更新：模块 `imports/providers/exports`、权限种子、E2E 或集成测试（若有）。

---

## Agent 检查清单

实现或修改接口时，自检：

1. 成功/失败是否都走**统一响应结构**与**业务码**？
2. 异常是否经**全局过滤器**处理，而非在 Controller 吞掉？
3. 需登录路由是否经 **JWT 守卫**？需权限的是否经 **Casbin**（或项目约定的 RBAC 守卫）？
4. Prisma 查询是否避免 N+1？写操作是否考虑事务？**修改 schema 后是否已执行 `pnpm prisma generate`？**
5. 涉及文件的是否**不**把敏感内网 URL 返回给客户端？
6. 是否更新 `.env.example` / 迁移 / 权限种子（若适用）？
7. 新增或变更 **MySQL / Redis / MinIO** 等依赖时，是否同步更新 **`docker-compose.yml`（或 `compose.yaml`）**、`.env.example` 与 `README` 启动说明？

---
