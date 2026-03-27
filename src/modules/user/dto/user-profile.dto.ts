import { ApiProperty } from "@nestjs/swagger";
import { UserStatus } from "@/generated/prisma/client";

/** GET /users/me 的 data 形状（与 findById select 一致） */
export class UserProfileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  name!: string | null;

  @ApiProperty({ nullable: true, description: "备注" })
  remark!: string | null;

  @ApiProperty({
    nullable: true,
    description:
      "主角色 code（如 super_admin），与 user_roles 一致；业务权限以 Casbin 为准",
  })
  roleCode!: string | null;

  @ApiProperty({
    enum: UserStatus,
    description: "ACTIVE 正常；DISABLED 停用（不可登录）",
  })
  status!: UserStatus;

  @ApiProperty({ description: "ISO 8601 时间字符串" })
  createdAt!: string;

  @ApiProperty({ description: "ISO 8601 时间字符串" })
  updatedAt!: string;
}
