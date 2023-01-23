import {
  S3Client,
  PutObjectCommand,
  S3ClientConfig,
  PutObjectCommandInput,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * A service which deals with AWS s3 uploading and downloading
 *
 * @param scannedBucketName The name of the bucket where scanned files go
 * @param s3Config The s3configuration to pass to the s3 client
 */
export class AwsService {
  constructor(
    protected scannedBucketName: string,
    protected s3Config: S3ClientConfig
  ) {}

  /**
   * Uploads a file from a `Buffer` to S3.
   *
   * @param bucket The name of the s3 bucket to upload to e.g. evidence
   * @param key The filepath to upload the file to e.g. a7a389fa/environment.pdf
   * @param file The file to upload
   * @returns If the file was successfully uploaded
   */
  async uploadFileToS3(bucket: string, key: string, file: Buffer) {
    const s3Command: PutObjectCommandInput = {
      Bucket: bucket,
      Key: key,
      Body: file,
    };
    const client = new S3Client(this.s3Config);
    const putObjectCommand = new PutObjectCommand(s3Command);
    await client.send(putObjectCommand);
  }

  /**
   * Creates a presigned url that is valid for 5 seconds which allows users to download the requested file
   *
   * @param key The key of the stored file. e.g. /evidence/a7a389fa/environment.pdf
   * @returns a presigned url which allows for downloading the file from S3
   */
  async s3GetSignedUrl(key: string): Promise<string> {
    const s3Command = {
      Bucket: this.scannedBucketName,
      Key: key,
    };
    const client = new S3Client(this.s3Config);
    const command = new GetObjectCommand(s3Command);
    return await getSignedUrl(client, command, { expiresIn: 5 });
  }
}
