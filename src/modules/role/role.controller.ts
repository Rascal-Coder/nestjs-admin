import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermission } from "@/common/decorators/require-permission.decorator";
import { ApiBearerAccessToken } from "@/common/swagger/api-bearer-access-token.decorator";
import { ApiOkResponseWrapped } from "@/common/swagger/api-ok-wrapped.decorator";
import { CreateRoleDto } from "./dto/create-role.dto";
import { PermissionCatalogDto } from "./dto/permission-catalog.dto";
import { PermissionItemDto } from "./dto/permission-item.dto";
import { QueryRoleListDto } from "./dto/query-role-list.dto";
import { RoleDetailDto } from "./dto/role-detail.dto";
import { RoleListDataDto } from "./dto/role-list-data.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { UpdateRolePermissionsDto } from "./dto/update-role-permissions.dto";
import { RoleService } from "./role.service";

@ApiTags("roles")
@ApiBearerAccessToken()
@Controller("roles")
export class RoleController {
  constructor(private readonly roles: RoleService) {}

  /** 静态路径须写在 :id 之前 */
  @Get("permissions")
  @RequirePermission("role", "read")
  @ApiOperation({ summary: "权限字典（用于分配角色权限）" })
  @ApiOkResponseWrapped(PermissionCatalogDto, PermissionItemDto)
  permissionCatalog() {
    return this.roles.listAllPermissions();
  }

  @Get()
  @RequirePermission("role", "read")
  @ApiOperation({ summary: "角色列表（分页）" })
  @ApiOkResponseWrapped(RoleListDataDto, RoleDetailDto, PermissionItemDto)
  list(@Query() query: QueryRoleListDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    return this.roles.listPaginated(page, pageSize);
  }

  @Get(":id")
  @RequirePermission("role", "read")
  @ApiOperation({ summary: "角色详情" })
  @ApiOkResponseWrapped(RoleDetailDto, PermissionItemDto)
  findOne(@Param("id") id: string) {
    return this.roles.findByIdOrThrow(id);
  }

  @Post()
  @RequirePermission("role", "write")
  @ApiOperation({
    summary: "创建角色",
    description:
      "权限字符即 code；菜单 id 与 GET /menus/tree 节点 id 一致，保存后按节点绑定的 permission 写入 Casbin。",
  })
  @ApiOkResponseWrapped(RoleDetailDto, PermissionItemDto)
  create(@Body() dto: CreateRoleDto) {
    return this.roles.create(dto);
  }

  @Patch(":id")
  @RequirePermission("role", "write")
  @ApiOperation({
    summary: "更新角色",
    description:
      "code 不可改；传入 menuIds 时全量替换菜单勾选并同步权限；不传 menuIds 则只改名称/顺序/状态/备注。",
  })
  @ApiOkResponseWrapped(RoleDetailDto, PermissionItemDto)
  update(@Param("id") id: string, @Body() dto: UpdateRoleDto) {
    return this.roles.updateById(id, dto);
  }

  @Patch(":id/permissions")
  @RequirePermission("role", "write")
  @ApiOperation({
    summary: "替换角色权限（按 permissionId）",
    description:
      "全量替换权限 id；会清空「菜单权限」勾选；若主要用菜单树配置，请用 PATCH 角色并传 menuIds。",
  })
  @ApiOkResponseWrapped(RoleDetailDto, PermissionItemDto)
  replacePermissions(
    @Param("id") id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.roles.replacePermissions(id, dto);
  }

  @Delete(":id")
  @RequirePermission("role", "write")
  @ApiOperation({ summary: "删除角色（系统内置角色不可删）" })
  async remove(@Param("id") id: string): Promise<void> {
    await this.roles.removeById(id);
  }
}
