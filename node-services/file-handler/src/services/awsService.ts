import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";


export type AwsServiceConfiguration = {
  bucket_quarantine: string,
  bucket_scanned: string,
}

export class AwsService {
  readonly configuration: AwsServiceConfiguration;

  constructor(configuration: AwsServiceConfiguration) {
    this.configuration = configuration;
  }

  /**
 * Uploads a file from a `Buffer` to S3.
 *
 * @param bucket The name of the s3 bucket to upload to e.g. evidence
 * @param key The filepath to upload the file to e.g. a7a389fa/environment.pdf
 * @param file The file to upload
 * @returns If the file was successfully uploaded
 */
  async uploadFileToS3 (bucket: string, key: string, file: Buffer) {
    const s3Command: PutObjectCommandInput = {
      Bucket: bucket,
      Key: key,
      Body: file,
    };
    const client = new S3Client({
      region: process.env["AWS_DEFAULT_REGION"],
      forcePathStyle: true,
      endpoint: "http://localstack-service:4566",
      credentials: {
        accessKeyId: "test",
        secretAccessKey: "test",
      },
    });
    const putObjectCommand = new PutObjectCommand(s3Command);
    await client.send(putObjectCommand);
  }
}