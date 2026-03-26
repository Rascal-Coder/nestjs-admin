import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import configuration from "./config/configuration";
import { envValidationSchema } from "./config/env.validation";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { RequestIdInterceptor } from "./common/interceptors/request-id.interceptor";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UserModule } from "./modules/user/user.module";
import { RbacModule } from "./modules/rbac/rbac.module";
import { StorageModule } from "./modules/storage/storage.module";
import { AppController } from "./app.controller";
import { JwtAuthGuard } from "./modules/auth/guards/jwt-auth.guard";
import { CasbinGuard } from "./modules/rbac/casbin.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UserModule,
    RbacModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: CasbinGuard },
  ],
})
export class AppModule {}
