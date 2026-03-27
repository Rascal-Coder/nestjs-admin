import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { RequirePermission } from "@/common/decorators/require-permission.decorator";
import { ApiBearerAccessToken } from "@/common/swagger/api-bearer-access-token.decorator";
import { ApiOkResponseWrapped } from "@/common/swagger/api-ok-wrapped.decorator";
import type { JwtPayload } from "@/modules/auth/interfaces/jwt-payload.interface";
import { CreateUserDto } from "./dto/create-user.dto";
import { QueryUserListDto } from "./dto/query-user-list.dto";
import { ResetPasswordResultDto } from "./dto/reset-password-result.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserListDataDto } from "./dto/user-list-data.dto";
import { UserProfileDto } from "./dto/user-profile.dto";
import { type ResetPasswordResult, UserService } from "./user.service";

@ApiTags("users")
@ApiBearerAccessToken()
@Controller("users")
export class UserController {
  constructor(private readonly users: UserService) {}

  @Get("me")
  @ApiOperation({ summary: "当前登录用户资料" })
  @ApiOkResponseWrapped(UserProfileDto)
  me(@CurrentUser() user: JwtPayload) {
    return this.users.getByIdOrThrow(user.sub);
  }

  @Get()
  @RequirePermission("user", "read")
  @ApiOperation({ summary: "用户列表（分页）" })
  @ApiOkResponseWrapped(UserListDataDto, UserProfileDto)
  list(@Query() query: QueryUserListDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    return this.users.listPaginated(page, pageSize);
  }

  @Get(":id")
  @RequirePermission("user", "read")
  @ApiOperation({ summary: "用户详情" })
  @ApiOkResponseWrapped(UserProfileDto)
  findOne(@Param("id") id: string) {
    return this.users.getByIdOrThrow(id);
  }

  @Post()
  @RequirePermission("user", "write")
  @ApiOperation({ summary: "创建用户" })
  @ApiOkResponseWrapped(UserProfileDto)
  create(@Body() dto: CreateUserDto) {
    return this.users.createByAdmin(dto);
  }

  @Post(":id/reset-password")
  @RequirePermission("user", "write")
  @ApiOperation({
    summary: "重置用户密码",
    description:
      "由后端随机生成新密码并写入数据库，不校验旧密码；明文仅在本次响应返回一次。",
  })
  @ApiOkResponseWrapped(ResetPasswordResultDto, UserProfileDto)
  async resetPassword(@Param("id") id: string): Promise<ResetPasswordResult> {
    return await this.users.resetPasswordById(id);
  }

  @Patch(":id")
  @RequirePermission("user", "write")
  @ApiOperation({
    summary: "更新用户",
    description:
      "更新他人或自己。操作自己时仍可改昵称、邮箱、密码；不可将本人状态设为停用；不可删除本人（请用删除接口，已禁止）。",
  })
  @ApiOkResponseWrapped(UserProfileDto)
  update(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.updateById(id, dto, user.sub);
  }

  @Delete(":id")
  @RequirePermission("user", "write")
  @ApiOperation({ summary: "删除用户" })
  async remove(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.users.removeById(id, user.sub);
  }
}
