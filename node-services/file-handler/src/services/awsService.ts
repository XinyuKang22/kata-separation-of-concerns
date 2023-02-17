import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";

export class AwsService {

  readonly client: any;
  readonly addValueToContentSizeHistogram;

  constructor (addValueToContentSizeHistogram: (value: number) => void) {
    this.addValueToContentSizeHistogram = addValueToContentSizeHistogram;
    this.client = new S3Client({
      region: process.env["AWS_DEFAULT_REGION"],
      forcePathStyle: true,
      endpoint: "http://localstack-service:4566",
      credentials: {
        accessKeyId: "test",
        secretAccessKey: "test",
      },
    });
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
    const putObjectCommand = new PutObjectCommand(s3Command);
    this.addValueToContentSizeHistogram(file.length);
    await this.client.send(putObjectCommand);
  }
}