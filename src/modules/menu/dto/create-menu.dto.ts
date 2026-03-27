import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";
import { MenuType } from "@/generated/prisma/client";

/** POST /menus */
export class CreateMenuDto {
  @ApiPropertyOptional({
    nullable: true,
    description: "父级菜单 id；不传或 null 表示顶级",
  })
  @Transform(({ value }: { value: unknown }) =>
    value === "" || value === undefined ? null : value,
  )
  @IsOptional()
  @ValidateIf((o: { parentId?: string | null }) => o.parentId != null)
  @IsString()
  @MinLength(1)
  parentId?: string | null;

  @ApiProperty({ description: "菜单名称（可与 i18n 文案 key 对应）" })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name!: string;

  @ApiPropertyOptional({ nullable: true, description: "路由地址" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  path?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: "激活路径（用于子路由高亮父级菜单等场景）",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  activePath?: string | null;

  @ApiPropertyOptional({ nullable: true, description: "前端组件路径等" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  component?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: "绑定的权限 id（目录可为空）",
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  permissionId?: string | null;

  @ApiPropertyOptional({ description: "排序，默认 0" })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ enum: MenuType, description: "默认 MENU" })
  @IsOptional()
  @IsEnum(MenuType)
  menuType?: MenuType;

  @ApiPropertyOptional({ description: "是否在菜单中显示，默认 true" })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @ApiPropertyOptional({ nullable: true, description: "图标类名等" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string | null;
}
