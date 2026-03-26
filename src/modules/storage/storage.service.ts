import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/** MinIO（S3 兼容）预签名上传/下载；业务仅存 bucket + key（见 AGENTS.md） */
@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    const minio = config.getOrThrow<{
      endpoint: string;
      accessKey: string;
      secretKey: string;
      bucket: string;
      region: string;
    }>("minio");

    this.bucket = minio.bucket;
    this.client = new S3Client({
      region: minio.region,
      endpoint: minio.endpoint,
      credentials: {
        accessKeyId: minio.accessKey,
        secretAccessKey: minio.secretKey,
      },
      forcePathStyle: true,
    });
  }

  async getPresignedPutUrl(
    objectKey: string,
    contentType: string,
    expiresIn = 3600,
  ): Promise<string> {
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, cmd, { expiresIn });
  }

  async getPresignedGetUrl(
    objectKey: string,
    expiresIn = 3600,
  ): Promise<string> {
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
    });
    return getSignedUrl(this.client, cmd, { expiresIn });
  }
}
