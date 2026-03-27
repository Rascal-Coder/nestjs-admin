import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserStatus } from "@/generated/prisma/client";

/** 登录/注册响应中的 user 片段（与 AuthService 返回字段对齐） */
export class UserSessionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true, required: false })
  name!: string | null;

  @ApiProperty({ nullable: true, required: false, description: "备注" })
  remark!: string | null;

  @ApiProperty({
    nullable: true,
    description: "主角色 code（如 super_admin）",
  })
  roleCode!: string | null;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiPropertyOptional({ description: "注册接口返回时包含" })
  createdAt?: string;
}
