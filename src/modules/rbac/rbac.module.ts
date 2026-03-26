import { Module } from "@nestjs/common";
import { CasbinGuard } from "./casbin.guard";
import { CasbinService } from "./casbin.service";

@Module({
  providers: [CasbinService, CasbinGuard],
  exports: [CasbinService, CasbinGuard],
})
export class RbacModule {}
