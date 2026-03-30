import { ApiPropertyOptional } from "@nestjs/swagger";
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

/** PATCH /menus/:id（全部可选） */
export class UpdateMenuDto {
  @ApiPropertyOptional({
    nullable: true,
    description: "父级菜单 id；传 null 表示改为顶级",
  })
  @Transform(({ value }: { value: unknown }) =>
    value === "" || value === undefined ? null : value,
  )
  @IsOptional()
  @ValidateIf((o: { parentId?: string | null }) => o.parentId != null)
  @IsString()
  @MinLength(1)
  parentId?: string | null;

  @ApiPropertyOptional({ description: "菜单名称" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  path?: string | null;

  @ApiPropertyOptional({ nullable: true, description: "激活路径" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  activePath?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: "目录默认重定向路径",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  redirect?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  permissionId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ enum: MenuType })
  @IsOptional()
  @IsEnum(MenuType)
  menuType?: MenuType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string | null;
}
