import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString } from "class-validator";

/** PATCH /roles/:id/permissions — 全量替换该角色下的权限绑定 */
export class UpdateRolePermissionsDto {
  @ApiProperty({
    type: [String],
    description: "权限 id 列表（全量替换）",
  })
  @IsArray()
  @IsString({ each: true })
  permissionIds!: string[];
}
