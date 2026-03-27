import { ApiProperty } from "@nestjs/swagger";
import { MenuTreeNodeDto } from "./menu-tree-node.dto";

/** GET /menus/tree 的 data */
export class MenuTreeDataDto {
  @ApiProperty({ type: [MenuTreeNodeDto] })
  items!: MenuTreeNodeDto[];
}
