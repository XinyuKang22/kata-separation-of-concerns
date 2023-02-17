import { v4 as uuidv4 } from "uuid";
import http from "http";
import { FastifyBaseLogger } from "fastify";
import { UploadRequest } from "../types";
import { AwsService, MetadataService, MetadataServiceConfiguration, VirusScanningService, VirusScanningServiceConfiguration } from ".";

export type EvidenceServiceConfiguration = {
  bucket_quarantine: string,
  bucket_scanned: string,
}

export class EvidenceService {

  readonly configuration: EvidenceServiceConfiguration;
  readonly awsService: AwsService;
  readonly metaDataService: MetadataService;
  readonly virusScanningService: VirusScanningService;
  readonly incrementCleanFilesCounter: () => void;
  readonly incrementInfectedFilesCounter: () => void;

  constructor(incrementCleanFilesCounter: () => void, 
  incrementInfectedFilesCounter: () => void,
  addValueToContentSizeHistogram: (value: number) => void,
  evidenceServiceConfiguration: EvidenceServiceConfiguration, 
  metaDataServiceConfiguration: MetadataServiceConfiguration, 
  virusScanningServiceConfiguration: VirusScanningServiceConfiguration) 
  {
    this.incrementCleanFilesCounter = incrementCleanFilesCounter;
    this.incrementInfectedFilesCounter = incrementInfectedFilesCounter;
    this.configuration = evidenceServiceConfiguration;
    this.awsService = new AwsService(addValueToContentSizeHistogram);
    this.metaDataService = new MetadataService(metaDataServiceConfiguration);
    this.virusScanningService = new VirusScanningService(virusScanningServiceConfiguration);
  }

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
  ): Promise<{ evidence_id: string } | Error> {
    log.info("Creating file buffer...")
    const fileBuffer = Buffer.from(inputParameters.base64_data, "base64");

    log.info("Generating S3 key for the content...")
    const s3Key = await s3KeyForContent(inputParameters);

    log.info(`Scanning content [${inputParameters.filename}] with size [${inputParameters.base64_data.length}] for viruses...`);
    const scanResults = await this.virusScanningService.scanContentForViruses(fileBuffer);

    if (scanResults.isInfected) {
      log.warn(`Scanned content [${inputParameters.filename}] with size [${inputParameters.base64_data.length}] is infected, will quarantine.`);
      this.incrementInfectedFilesCounter();
      return await handleInfectedFile(this.awsService, this.configuration.bucket_quarantine, s3Key, fileBuffer);
    } else {
      log.info(`Scanned content [${inputParameters.filename}] with size [${inputParameters.base64_data.length}] is not infected, passing.`);
      this.incrementCleanFilesCounter();
      return await handleCleanFile(inputParameters, this.metaDataService, this.awsService, this.configuration.bucket_quarantine, s3Key, fileBuffer);
    }
  };

  async fetchDetails(evidenceId: string) {
    this.metaDataService.fetchDetails(evidenceId);
  }
}

async function handleInfectedFile(awsService: AwsService, bucket_quarantine:string, s3Key:string, fileBuffer:Buffer) {
  await awsService.uploadFileToS3(
    bucket_quarantine,
    s3Key,
    fileBuffer
  );
  
  return new Error("File is infected");
}

async function handleCleanFile(inputParameters: UploadRequest["body"]["input"]["data"]
, metaDataService: MetadataService, awsService: AwsService
, bucket_scanned: string, s3Key: string, fileBuffer: Buffer) 
{
  await awsService.uploadFileToS3(bucket_scanned, s3Key, fileBuffer);

  const doc = await metaDataService.storeMetadataInMongo(inputParameters, s3Key);

  return { evidence_id: doc.insertedId.toString() };
}

async function s3KeyForContent(inputParameters: UploadRequest["body"]["input"]["data"]) {
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
  return s3Key;
}