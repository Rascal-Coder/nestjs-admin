import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermission } from "@/common/decorators/require-permission.decorator";
import { ApiBearerAccessToken } from "@/common/swagger/api-bearer-access-token.decorator";
import { ApiOkResponseWrapped } from "@/common/swagger/api-ok-wrapped.decorator";
import { PermissionItemDto } from "@/modules/role/dto/permission-item.dto";
import { CreateMenuDto } from "./dto/create-menu.dto";
import { MenuDetailDto } from "./dto/menu-detail.dto";
import { MenuTreeDataDto } from "./dto/menu-tree-data.dto";
import { MenuTreeNodeDto } from "./dto/menu-tree-node.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";
import { MenuService } from "./menu.service";

@ApiTags("menus")
@ApiBearerAccessToken()
@Controller("menus")
export class MenuController {
  constructor(private readonly menus: MenuService) {}

  /** 与 GET /menus/tree、/menus/list 相同；便于与「列表类」REST 约定对齐 */
  @Get()
  @RequirePermission("menu", "read")
  @ApiOperation({
    summary: "菜单树（列表）",
    description:
      "用于菜单管理及角色表单的「菜单权限」勾选；节点可挂 permission，保存角色时据此汇总 Casbin 所需权限。",
  })
  @ApiOkResponseWrapped(MenuTreeDataDto, MenuTreeNodeDto, PermissionItemDto)
  list() {
    return this.menus.getTree();
  }

  @Get(["tree", "list"])
  @RequirePermission("menu", "read")
  @ApiOperation({
    summary: "菜单树（/tree、/list 别名）",
    description: "与 GET /menus 响应相同。",
  })
  @ApiOkResponseWrapped(MenuTreeDataDto, MenuTreeNodeDto, PermissionItemDto)
  tree() {
    return this.menus.getTree();
  }

  @Get(":id")
  @RequirePermission("menu", "read")
  @ApiOperation({ summary: "菜单详情" })
  @ApiOkResponseWrapped(MenuDetailDto, PermissionItemDto)
  findOne(@Param("id") id: string) {
    return this.menus.findByIdOrThrow(id);
  }

  @Post()
  @RequirePermission("menu", "write")
  @ApiOperation({ summary: "创建菜单" })
  @ApiOkResponseWrapped(MenuDetailDto, PermissionItemDto)
  create(@Body() dto: CreateMenuDto) {
    return this.menus.create(dto);
  }

  @Patch(":id")
  @RequirePermission("menu", "write")
  @ApiOperation({ summary: "更新菜单" })
  @ApiOkResponseWrapped(MenuDetailDto, PermissionItemDto)
  update(@Param("id") id: string, @Body() dto: UpdateMenuDto) {
    return this.menus.updateById(id, dto);
  }

  @Delete(":id")
  @RequirePermission("menu", "write")
  @ApiOperation({
    summary: "删除菜单",
    description: "删除子级菜单及关联 role_menus 由数据库级联处理。",
  })
  async remove(@Param("id") id: string): Promise<void> {
    await this.menus.removeById(id);
  }
}
