import { ApiProperty } from "@nestjs/swagger";

/** GET /health 的 data 形状 */
export class HealthDataDto {
  @ApiProperty({ example: "ok" })
  status!: string;
}
