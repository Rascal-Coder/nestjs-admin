import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { BusinessCode } from "@/common/constants/business-code";
import { BusinessException } from "@/common/exceptions/business.exception";
import { HttpStatus } from "@nestjs/common";
import type { JwtPayload } from "./interfaces/jwt-payload.interface";
import { UserStatus } from "@/generated/prisma/client";
import { UserService } from "@/modules/user/user.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserService,
    private readonly jwt: JwtService,
  ) {}

  async register(email: string, password: string, name?: string) {
    const exists = await this.users.findByEmail(email);
    if (exists) {
      throw new BusinessException(
        BusinessCode.USER_EMAIL_EXISTS,
        "该邮箱已注册",
        HttpStatus.CONFLICT,
      );
    }
    const user = await this.users.create(email, password, name);
    const tokens = await this.signTokens(user.id, user.email, user.roleCode);
    return { user, ...tokens };
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new BusinessException(
        BusinessCode.USER_INVALID_CREDENTIALS,
        "邮箱或密码错误",
        HttpStatus.UNAUTHORIZED,
      );
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new BusinessException(
        BusinessCode.USER_INVALID_CREDENTIALS,
        "邮箱或密码错误",
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (user.status === UserStatus.DISABLED) {
      throw new BusinessException(
        BusinessCode.USER_DISABLED,
        "账号已停用",
        HttpStatus.FORBIDDEN,
      );
    }
    const tokens = await this.signTokens(user.id, user.email, user.roleCode);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        remark: user.remark,
        roleCode: user.roleCode,
        status: user.status,
      },
      ...tokens,
    };
  }

  private async signTokens(
    userId: string,
    email: string,
    roleCode?: string | null,
  ) {
    const payload: JwtPayload = { sub: userId, email, roleCode };
    const accessToken = await this.jwt.signAsync(payload);
    return { accessToken };
  }
}
