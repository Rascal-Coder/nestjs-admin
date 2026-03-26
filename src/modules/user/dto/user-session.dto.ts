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

  @ApiProperty({ description: "是否管理员（业务标记）" })
  isAdmin!: boolean;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiPropertyOptional({ description: "注册接口返回时包含" })
  createdAt?: string;
}
