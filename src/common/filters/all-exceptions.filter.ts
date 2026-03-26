import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@/generated/prisma/client";
import { Request, Response } from "express";
import { BusinessCode } from "../constants/business-code";
import { BusinessException } from "../exceptions/business.exception";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    const requestId = request.requestId ?? "";
    const path = request.url;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = BusinessCode.BAD_REQUEST;
    let message = "服务器内部错误";

    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      const res = exception.getResponse() as {
        message?: string;
        businessCode?: BusinessCode;
      };
      code = exception.businessCode;
      message =
        typeof res.message === "string" ? res.message : exception.message;
      // 此前未记录业务异常，Casbin 403 等在生产/开发都无日志，不便排查
      this.logger.warn(
        `${request.method} ${path} → ${status} code=${code} msg=${message} requestId=${requestId}`,
      );
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === "string") {
        message = res;
      } else if (res && typeof res === "object" && "message" in res) {
        const m = (res as { message: string | string[] }).message;
        message = Array.isArray(m) ? m.join(", ") : m;
      }
      code =
        status === HttpStatus.UNAUTHORIZED
          ? BusinessCode.UNAUTHORIZED
          : BusinessCode.BAD_REQUEST;
      if (status === HttpStatus.FORBIDDEN) code = BusinessCode.FORBIDDEN;
      if (status === HttpStatus.NOT_FOUND) code = BusinessCode.NOT_FOUND;
      if (
        status === HttpStatus.UNAUTHORIZED ||
        status === HttpStatus.FORBIDDEN
      ) {
        this.logger.warn(
          `${request.method} ${path} → ${status} msg=${message} requestId=${requestId}`,
        );
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      code = BusinessCode.BAD_REQUEST;
      message = this.mapPrismaKnownMessage(exception);
      this.logger.warn(`Prisma ${exception.code}: ${exception.message}`);
    } else if (exception instanceof Error) {
      message =
        process.env.NODE_ENV === "production" ? message : exception.message;
      this.logger.error(exception.stack ?? exception.message);
    } else {
      this.logger.error(String(exception));
    }

    const body = {
      success: false,
      code,
      message,
      data: null,
      requestId,
      path,
    };

    response.status(status).json(body);
  }

  private mapPrismaKnownMessage(
    err: Prisma.PrismaClientKnownRequestError,
  ): string {
    switch (err.code) {
      case "P2002":
        return "唯一约束冲突";
      case "P2025":
        return "记录不存在";
      default:
        return "数据操作失败";
    }
  }
}
