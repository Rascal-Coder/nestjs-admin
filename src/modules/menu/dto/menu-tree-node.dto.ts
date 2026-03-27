import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MenuType } from "@/generated/prisma/client";
import { PermissionItemDto } from "@/modules/role/dto/permission-item.dto";

/** 菜单树节点（供前端 el-tree / a-tree 使用） */
export class MenuTreeNodeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  parentId!: string | null;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  path!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: "激活路径（用于子路由高亮父级菜单等场景）",
  })
  activePath!: string | null;

  @ApiPropertyOptional({ nullable: true })
  component!: string | null;

  @ApiProperty({ enum: MenuType })
  menuType!: MenuType;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  visible!: boolean;

  @ApiPropertyOptional({ nullable: true })
  icon!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: "节点绑定的权限（目录可为空；保存角色时汇总所有勾选节点上的 permission）",
  })
  permission!: PermissionItemDto | null;

  @ApiProperty({ type: () => [MenuTreeNodeDto] })
  children!: MenuTreeNodeDto[];
}
