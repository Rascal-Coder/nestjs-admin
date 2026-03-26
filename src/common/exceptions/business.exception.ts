import { HttpException, HttpStatus } from "@nestjs/common";
import type { BusinessCode } from "../constants/business-code";

/**
 * 携带业务码的异常；由全局过滤器映射为统一 JSON。
 * httpStatus 用于 REST 语义；响应体仍带 code 字段。
 */
export class BusinessException extends HttpException {
  constructor(
    public readonly businessCode: BusinessCode,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ message, businessCode }, httpStatus);
  }
}
