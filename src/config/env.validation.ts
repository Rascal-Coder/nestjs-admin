import * as Joi from "joi";

/** 启动时校验环境变量，缺失或非法则进程退出 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().port().default(8000),
  API_PREFIX: Joi.string().default("api"),

  DATABASE_URL: Joi.string().required(),

  REDIS_URL: Joi.string().required(),

  MINIO_ENDPOINT: Joi.string().uri().required(),
  MINIO_ACCESS_KEY: Joi.string().required(),
  MINIO_SECRET_KEY: Joi.string().required(),
  MINIO_BUCKET: Joi.string().required(),
  MINIO_REGION: Joi.string().default("us-east-1"),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default("15m"),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default("7d"),

  CASBIN_MODEL_PATH: Joi.string().default("src/casbin/model.conf"),
});
