import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { UserStatus } from "@/generated/prisma/client";

/** POST /users 管理员创建用户 */
export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "备注（可选）" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remark?: string;

  @ApiPropertyOptional({ enum: UserStatus, description: "默认 ACTIVE" })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
