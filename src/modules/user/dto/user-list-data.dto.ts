import { ApiProperty } from "@nestjs/swagger";
import { UserProfileDto } from "./user-profile.dto";

/** GET /users 的 data：分页列表 */
export class UserListDataDto {
  @ApiProperty({ type: [UserProfileDto] })
  items!: UserProfileDto[];

  @ApiProperty({ description: "符合条件的总条数" })
  total!: number;
}
