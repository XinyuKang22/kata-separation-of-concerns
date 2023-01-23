import { Readable } from "stream";
import { v4 as uuidv4 } from "uuid";
import http from "http";
import { createEvidence, getEvidenceS3Key } from "../data/evidenceDao";
import { FastifyBaseLogger } from "fastify";
import { AwsService, ClamAVService } from ".";
import { DownloadRequest, UploadRequest } from "../types";
import { Errors, isErrors } from ".";

/**
 * A service which deals with uploading and downloading evidence
 *
 * @param quarantinedBucketName The name of the bucket where quarantined files go
 * @param scannedBucketName The name of the bucket where scanned files go
 * @param awsService The service which can upload files to s3
 * @param virusScannerService The service which allows for virus scanning
 * @param signedURLPostProcessor a transformer function which gets applied to the result of 'fileDownload'
 */
export class EvidenceService {
  constructor(
    protected quarantinedBucketName: string,
    protected scannedBucketName: string,
    protected awsService: AwsService,
    protected virusScannerService: ClamAVService,
    protected signedURLPostProcessor: (signedUrl: string) => string
  ) {}

  /**
   * Given a file and its required fields this scans the file using clamAV,
   * Uploads it to s3 and creates a row in the database for it.
   *
   * @param inputParameters The parameters parsed in through the request
   * @param requestHeaders The headers for a http request. should contain auth tokens for hasura
   * @param log Logger
   * @returns Either the uuid of the evidence or an error
   */
  async fileUpload(
    inputParameters: UploadRequest["body"]["input"]["data"],
    requestHeaders: http.IncomingHttpHeaders,
    log: FastifyBaseLogger
  ): Promise<{ evidence_id: string } | Errors> {
    try {
      log.info(`Received file [${inputParameters.filename}].`);
      const fileBuffer = Buffer.from(inputParameters.base64_data, "base64");
      const fileInfected =
        await this.virusScannerService.scanStreamForInfections(
          Readable.from(fileBuffer),
          inputParameters.filename,
          log
        );

      const uuid = uuidv4();
      const currentDate = new Date();
      const dateString =
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        currentDate.getFullYear() +
        "/" +
        (currentDate.getMonth() + 1) +
        "/" +
        currentDate.getDate();
      const s3Key = dateString + "/" + uuid + "/" + inputParameters.filename;
      const uploadDestinationBucket = fileInfected
        ? this.quarantinedBucketName
        : this.scannedBucketName;

      try {
        log.info(
          `Uploading file [${inputParameters.filename}] to S3 under [${s3Key}].`
        );
        await this.awsService.uploadFileToS3(
          uploadDestinationBucket,
          s3Key,
          fileBuffer
        );
        log.info(
          `File [${inputParameters.filename}] successfully uploaded to s3.`
        );
      } catch (e) {
        log.error(
          e,
          `Failed to upload file [${inputParameters.filename}] to s3.`
        );
        return {
          errors: [`Failed to store file [${inputParameters.filename}].`],
        };
      }

      log.info(`Creating evidence row for file [${inputParameters.filename}].`);

      const evidenceResult = await createEvidence(
        inputParameters,
        uuid,
        s3Key,
        fileInfected
      );

      if (isErrors(evidenceResult)) {
        return evidenceResult;
      }

      log.info(
        `Successfully created evidence row [${evidenceResult}] for file [${inputParameters.filename}].`
      );

      return fileInfected
        ? {
            errors: [
              `Failed upload as [${inputParameters.filename}] failed the virus scan.`,
            ],
          }
        : { evidence_id: evidenceResult };
    } catch (e) {
      log.error(e, `Failed to process file [${inputParameters.filename}].`);
      return {
        errors: [`Failed to process file [${inputParameters.filename}].`],
      };
    }
  }

  /**
   * Fetches a presigned url from a given evidence id.
   *
   * @param inputParameters The parameters parsed in through the request
   * @param requestHeaders The headers for a http request. should contain auth tokens for hasura
   * @param log Logger
   * @returns
   */
  async fileDownload(
    inputParameters: DownloadRequest["body"]["input"]["data"],
    requestHeaders: http.IncomingHttpHeaders,
    log: FastifyBaseLogger
  ): Promise<{ signed_s3_url: string } | Errors> {
    const evidence = await getEvidenceS3Key(
      inputParameters.evidence_id
    );

    if (isErrors(evidence)) {
      return evidence;
    }

    log.info(
      `Found s3 key [${evidence}] for evidence [${inputParameters.evidence_id}]`
    );

    try {
      const signedUrl = await this.awsService.s3GetSignedUrl(evidence.s3_key);
      const processedSignedUrl = this.signedURLPostProcessor(signedUrl);
      return { signed_s3_url: processedSignedUrl };
    } catch (e) {
      log.error(e, `Failed to process get signed url for [${evidence.s3_key}].`);
      return {
        errors: [`Failed to process get signed url for [${evidence.s3_key}].`],
      };
    }
  }
}
