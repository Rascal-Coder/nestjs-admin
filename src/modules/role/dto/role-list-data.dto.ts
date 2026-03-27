import { ApiProperty } from "@nestjs/swagger";
import { RoleDetailDto } from "./role-detail.dto";

/** GET /roles 的 data：分页列表 */
export class RoleListDataDto {
  @ApiProperty({ type: [RoleDetailDto] })
  items!: RoleDetailDto[];

  @ApiProperty({ description: "符合条件的总条数" })
  total!: number;
}
