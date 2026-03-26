import { ApiProperty } from "@nestjs/swagger";
import { UserSessionDto } from "@/modules/user/dto/user-session.dto";

/** 登录、注册接口返回的 data（user + accessToken） */
export class AuthSessionDataDto {
  @ApiProperty({ type: UserSessionDto })
  user!: UserSessionDto;

  @ApiProperty({ description: "JWT Access Token" })
  accessToken!: string;
}
