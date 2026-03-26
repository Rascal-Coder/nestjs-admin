import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Request } from "express";
import { BusinessCode } from "../constants/business-code";

export interface ApiSuccessBody<T> {
  success: true;
  code: BusinessCode;
  message: string;
  data: T;
  requestId: string;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessBody<unknown>> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { requestId?: string }>();
    const requestId = req.requestId ?? "";

    return next.handle().pipe(
      map((data: unknown) => ({
        success: true,
        code: BusinessCode.OK,
        message: "ok",
        data: data ?? null,
        requestId,
      })),
    );
  }
}
