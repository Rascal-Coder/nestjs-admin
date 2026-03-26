import { IsString, MinLength } from "class-validator";

export class PresignUploadDto {
  @IsString()
  @MinLength(1)
  objectKey!: string;

  @IsString()
  @MinLength(1)
  contentType!: string;
}
