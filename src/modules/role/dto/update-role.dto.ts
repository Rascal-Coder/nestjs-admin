import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { RoleStatus } from "@/generated/prisma/client";

/** PATCH /roles/:id */
export class UpdateRoleDto {
  @ApiPropertyOptional({ description: "角色名称" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name?: string;

  @ApiPropertyOptional({ enum: RoleStatus })
  @IsOptional()
  @IsEnum(RoleStatus)
  status?: RoleStatus;

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remark?: string;

  @ApiPropertyOptional({
    type: [String],
    description: "传入则全量替换菜单勾选（不传则不修改菜单与由菜单汇总的权限）",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  menuIds?: string[];
}
