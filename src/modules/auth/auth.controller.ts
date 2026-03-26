import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "@/common/decorators/public.decorator";
import { ApiOkResponseWrapped } from "@/common/swagger/api-ok-wrapped.decorator";
import { UserSessionDto } from "@/modules/user/dto/user-session.dto";
import { AuthService } from "./auth.service";
import { AuthSessionDataDto } from "./dto/auth-session-data.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("register")
  @ApiOkResponseWrapped(AuthSessionDataDto, UserSessionDto)
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password, dto.name);
  }

  @Public()
  @Post("login")
  @ApiOkResponseWrapped(AuthSessionDataDto, UserSessionDto)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }
}
