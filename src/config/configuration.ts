import { join } from "path";

export default () => ({
  port: parseInt(process.env.PORT ?? "8000", 10),
  apiPrefix: process.env.API_PREFIX ?? "api",
  nodeEnv: process.env.NODE_ENV ?? "development",

  databaseUrl: process.env.DATABASE_URL,

  redisUrl: process.env.REDIS_URL,

  minio: {
    endpoint: process.env.MINIO_ENDPOINT,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    bucket: process.env.MINIO_BUCKET,
    region: process.env.MINIO_REGION ?? "us-east-1",
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  },

  casbin: {
    modelPath: join(
      process.cwd(),
      process.env.CASBIN_MODEL_PATH ?? "src/casbin/model.conf",
    ),
  },
});
