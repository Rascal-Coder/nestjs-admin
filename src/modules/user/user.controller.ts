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
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserListDataDto } from "./dto/user-list-data.dto";
import { UserProfileDto } from "./dto/user-profile.dto";
import { UserService } from "./user.service";

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

  @Patch(":id")
  @RequirePermission("user", "write")
  @ApiOperation({ summary: "更新用户" })
  @ApiOkResponseWrapped(UserProfileDto)
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.users.updateById(id, dto);
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
