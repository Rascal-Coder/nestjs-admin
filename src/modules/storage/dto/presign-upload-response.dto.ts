import { ApiProperty } from "@nestjs/swagger";

/** POST /storage/presign-upload 的 data 形状 */
export class PresignUploadDataDto {
  @ApiProperty({ description: "预签名 PUT URL" })
  url!: string;

  @ApiProperty({ description: "上传提示文案" })
  bucketHint!: string;
}
