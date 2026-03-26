import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { JWT_BEARER_SWAGGER_SCHEME } from "@/common/constants/jwt-auth";

export function ApiBearerAccessToken() {
  return applyDecorators(ApiBearerAuth(JWT_BEARER_SWAGGER_SCHEME));
}
