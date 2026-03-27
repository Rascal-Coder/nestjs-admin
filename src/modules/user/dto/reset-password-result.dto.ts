import { ApiProperty } from "@nestjs/swagger";
import { UserProfileDto } from "./user-profile.dto";

/** POST /users/:id/reset-password 成功时 data 形状 */
export class ResetPasswordResultDto {
  @ApiProperty({ type: UserProfileDto })
  user!: UserProfileDto;

  @ApiProperty({
    description:
      "后端随机生成的新密码，仅本次响应明文返回，请管理员妥善转交用户",
  })
  newPassword!: string;
}
