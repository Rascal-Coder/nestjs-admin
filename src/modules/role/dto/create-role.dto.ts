import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { RoleStatus } from "@/generated/prisma/client";

/** POST /roles（名称、权限字符、状态、备注、菜单勾选） */
export class CreateRoleDto {
  @ApiProperty({
    description: "权限字符：唯一标识，小写字母开头，仅含小写字母、数字、下划线",
    example: "editor",
  })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: "code 须为小写字母开头，仅含小写字母、数字、下划线",
  })
  code!: string;

  @ApiProperty({ description: "角色名称", example: "编辑" })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name!: string;

  @ApiPropertyOptional({ enum: RoleStatus, description: "默认 ACTIVE" })
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
    description:
      "菜单权限（菜单 id 全量）；保存后按节点 permission 汇总到 Casbin",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  menuIds?: string[];
}
