import { HttpStatus, Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import type { Prisma } from "@/generated/prisma/client";
import type { UserStatus } from "@/generated/prisma/client";
import { BusinessCode } from "@/common/constants/business-code";
import { BusinessException } from "@/common/exceptions/business.exception";
import { PrismaService } from "@/prisma/prisma.service";
import type { CreateUserDto } from "./dto/create-user.dto";
import type { UpdateUserDto } from "./dto/update-user.dto";

const userPublicSelect = {
  id: true,
  email: true,
  name: true,
  isAdmin: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

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
    opts?: { isAdmin?: boolean; status?: UserStatus },
  ) {
    const passwordHash = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        ...(opts?.isAdmin !== undefined ? { isAdmin: opts.isAdmin } : {}),
        ...(opts?.status !== undefined ? { status: opts.status } : {}),
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
      isAdmin: dto.isAdmin,
      status: dto.status,
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

  async updateById(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new BusinessException(
        BusinessCode.NOT_FOUND,
        "用户不存在",
        HttpStatus.NOT_FOUND,
      );
    }
    if (
      dto.email === undefined &&
      dto.name === undefined &&
      dto.password === undefined &&
      dto.isAdmin === undefined &&
      dto.status === undefined
    ) {
      return {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        isAdmin: existing.isAdmin,
        status: existing.status,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      };
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
    if (dto.isAdmin !== undefined) data.isAdmin = dto.isAdmin;
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
}
