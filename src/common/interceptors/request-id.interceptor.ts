import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { Observable } from "rxjs";
import { Request, Response } from "express";

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { requestId?: string }>();
    const res = http.getResponse<Response>();

    const headerId = req.headers["x-request-id"];
    const requestId =
      typeof headerId === "string" && headerId.length > 0
        ? headerId
        : randomUUID();
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);

    return next.handle();
  }
}
