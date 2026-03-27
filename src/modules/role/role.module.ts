import { Module } from "@nestjs/common";
import { RbacModule } from "@/modules/rbac/rbac.module";
import { RoleController } from "./role.controller";
import { RoleService } from "./role.service";

@Module({
  imports: [RbacModule],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
