import { ApiProperty } from "@nestjs/swagger";
import { PermissionItemDto } from "./permission-item.dto";

/** GET /roles/permissions 的 data */
export class PermissionCatalogDto {
  @ApiProperty({ type: [PermissionItemDto] })
  items!: PermissionItemDto[];
}
