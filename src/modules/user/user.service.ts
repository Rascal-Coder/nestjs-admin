import { randomBytes } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { UserStatus, type Prisma } from "@/generated/prisma/client";
import { BusinessCode } from "@/common/constants/business-code";
import { BusinessException } from "@/common/exceptions/business.exception";
import { PrismaService } from "@/prisma/prisma.service";
import type { CreateUserDto } from "./dto/create-user.dto";
import type { UpdateUserDto } from "./dto/update-user.dto";

const userPublicSelect = {
  id: true,
  email: true,
  name: true,
  remark: true,
  roleCode: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

/** 与 userPublicSelect 一致的公开用户类型（显式标注可避免 Prisma 推断成 error，触发 no-unsafe-*） */
export type UserPublic = Prisma.UserGetPayload<{
  select: typeof userPublicSelect;
}>;

/** 管理员重置密码：更新库内哈希并在响应中返回一次明文 */
export type ResetPasswordResult = {
  user: UserPublic;
  newPassword: string;
};

/** 生成满足强度要求的随机登录密码（长度与字符集由后端统一） */
function generateRandomPassword(): string {
  return randomBytes(12).toString("base64url");
}

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });
  }

  async create(
    email: string,
    password: string,
    name?: string,
    opts?: { status?: UserStatus; remark?: string },
  ) {
    const passwordHash = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        ...(opts?.status !== undefined ? { status: opts.status } : {}),
        ...(opts?.remark !== undefined ? { remark: opts.remark } : {}),
      },
      select: userPublicSelect,
    });
  }

  /** 管理员创建用户：校验邮箱唯一 */
  async createByAdmin(dto: CreateUserDto) {
    const exists = await this.findByEmail(dto.email);
    if (exists) {
      throw new BusinessException(
        BusinessCode.USER_EMAIL_EXISTS,
        "该邮箱已注册",
        HttpStatus.CONFLICT,
      );
    }
    return this.create(dto.email, dto.password, dto.name, {
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
    });
  }

  async listPaginated(page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: userPublicSelect,
      }),
      this.prisma.user.count(),
    ]);
    return { items, total };
  }

  async getByIdOrThrow(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new BusinessException(
        BusinessCode.NOT_FOUND,
        "用户不存在",
        HttpStatus.NOT_FOUND,
      );
    }
    return user;
  }

  /**
   * 更新用户。若更新的是当前登录用户本人：允许改昵称、邮箱、密码、保持启用；
   * 禁止将本人状态设为 DISABLED（避免误操作把自己锁在系统外）。
   */
  async updateById(id: string, dto: UpdateUserDto, currentUserId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new BusinessException(
        BusinessCode.NOT_FOUND,
        "用户不存在",
        HttpStatus.NOT_FOUND,
      );
    }
    if (
      currentUserId !== undefined &&
      id === currentUserId &&
      dto.status === UserStatus.DISABLED
    ) {
      throw new BusinessException(
        BusinessCode.FORBIDDEN,
        "不能停用自己账号",
        HttpStatus.FORBIDDEN,
      );
    }
    if (
      dto.email === undefined &&
      dto.name === undefined &&
      dto.remark === undefined &&
      dto.password === undefined &&
      dto.status === undefined
    ) {
      // 与 findById 同构，避免手写字段触发 no-unsafe-assignment（DTO/Prisma 交叉推断时易出现 error 类型）
      return this.prisma.user.findUniqueOrThrow({
        where: { id },
        select: userPublicSelect,
      });
    }

    if (dto.email !== undefined && dto.email !== existing.email) {
      const taken = await this.findByEmail(dto.email);
      if (taken) {
        throw new BusinessException(
          BusinessCode.USER_EMAIL_EXISTS,
          "该邮箱已被使用",
          HttpStatus.CONFLICT,
        );
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.remark !== undefined) {
      data.remark = dto.remark;
    }
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: userPublicSelect,
    });
  }

  /** 删除用户；禁止删除当前登录账号以免误锁系统 */
  async removeById(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new BusinessException(
        BusinessCode.FORBIDDEN,
        "不能删除当前登录账号",
        HttpStatus.FORBIDDEN,
      );
    }
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new BusinessException(
        BusinessCode.NOT_FOUND,
        "用户不存在",
        HttpStatus.NOT_FOUND,
      );
    }
    await this.prisma.user.delete({ where: { id } });
  }

  /** 管理员重置指定用户密码：后端生成新密码，不校验旧密码 */
  async resetPasswordById(id: string): Promise<ResetPasswordResult> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new BusinessException(
        BusinessCode.NOT_FOUND,
        "用户不存在",
        HttpStatus.NOT_FOUND,
      );
    }
    const newPassword = generateRandomPassword();
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const user = await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
      select: userPublicSelect,
    });
    return { user, newPassword };
  }
}
