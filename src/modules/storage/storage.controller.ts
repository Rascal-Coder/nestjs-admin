import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RequirePermission } from "@/common/decorators/require-permission.decorator";
import { ApiBearerAccessToken } from "@/common/swagger/api-bearer-access-token.decorator";
import { ApiOkResponseWrapped } from "@/common/swagger/api-ok-wrapped.decorator";
import { PresignUploadDataDto } from "./dto/presign-upload-response.dto";
import { PresignUploadDto } from "./dto/presign-upload.dto";
import { StorageService } from "./storage.service";

@ApiTags("storage")
@ApiBearerAccessToken()
@Controller("storage")
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post("presign-upload")
  @RequirePermission("storage", "write")
  @ApiOkResponseWrapped(PresignUploadDataDto)
  async presignUpload(@Body() dto: PresignUploadDto) {
    const url = await this.storage.getPresignedPutUrl(
      dto.objectKey,
      dto.contentType,
    );
    return { url, bucketHint: "使用预签名 URL 直传，勿暴露内网 endpoint" };
  }
}
