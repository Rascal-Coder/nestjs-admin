import { ApiProperty } from "@nestjs/swagger";
import { RoleStatus } from "@/generated/prisma/client";
import { PermissionItemDto } from "./permission-item.dto";

/** 角色详情（含权限列表、已勾选菜单 id） */
export class RoleDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: "super_admin", description: "权限字符 / 角色标识" })
  code!: string;

  @ApiProperty({ example: "超管", description: "角色名称" })
  name!: string;

  @ApiProperty({ enum: RoleStatus, description: "角色状态" })
  status!: RoleStatus;

  @ApiProperty({ nullable: true, description: "备注" })
  remark!: string | null;

  @ApiProperty({
    type: [String],
    description: "已勾选的菜单 id（与菜单树节点 id 对应）",
  })
  menuIds!: string[];

  @ApiProperty({
    type: [PermissionItemDto],
    description:
      "当前角色在 Casbin 中的权限（由菜单勾选汇总，或由 PATCH permissions 直接分配）",
  })
  permissions!: PermissionItemDto[];

  @ApiProperty({ description: "ISO 8601 时间字符串" })
  createdAt!: string;

  @ApiProperty({ description: "ISO 8601 时间字符串" })
  updatedAt!: string;
}
