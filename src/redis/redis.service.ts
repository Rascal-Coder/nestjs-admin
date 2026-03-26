import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

const KEY_PREFIX = "nest-admin:";

/** Redis 封装：键名统一前缀，供会话黑名单、限流等使用（见 AGENTS.md） */
@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(config: ConfigService) {
    super(config.getOrThrow<string>("redisUrl"), {
      keyPrefix: KEY_PREFIX,
    });
  }

  onModuleDestroy(): void {
    this.disconnect();
  }
}
