import { ApiProperty } from "@nestjs/swagger";

/** 权限条目（列表/嵌套展示） */
export class PermissionItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: "user:read" })
  code!: string;

  @ApiProperty({ example: "用户管理-读取" })
  name!: string;

  @ApiProperty({ description: "ISO 8601 时间字符串" })
  createdAt!: string;

  @ApiProperty({ description: "ISO 8601 时间字符串" })
  updatedAt!: string;
}
