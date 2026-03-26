import { Type, applyDecorators } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from "@nestjs/swagger";
import { BusinessCode } from "../constants/business-code";

/**
 * 声明经 TransformInterceptor 包装后的成功响应体，便于 OpenAPI / openapi2ts 生成类型。
 * data 字段引用传入的 DTO 类；若有嵌套 DTO，请一并传入 extraModels 以便生成 $ref。
 */
export function ApiOkResponseWrapped<TModel extends Type<unknown>>(
  dataModel: TModel,
  ...extraModels: Type<unknown>[]
) {
  return applyDecorators(
    ApiExtraModels(dataModel, ...extraModels),
    ApiOkResponse({
      description: "统一成功响应（success/code/message/data/requestId）",
      schema: {
        type: "object",
        required: ["success", "code", "message", "data", "requestId"],
        properties: {
          success: { type: "boolean", example: true },
          code: {
            type: "number",
            example: BusinessCode.OK,
            description: "业务码，0 表示成功",
          },
          message: { type: "string", example: "ok" },
          data: { $ref: getSchemaPath(dataModel) },
          requestId: {
            type: "string",
            example: "550e8400-e29b-41d4-a716-446655440000",
            description: "请求追踪 ID",
          },
        },
      },
    }),
  );
}
