import { v4 as uuidv4 } from "uuid";
import http from "http";
import { FastifyBaseLogger } from "fastify";
import { chainableError, uploadFileToS3 } from ".";
import { UploadRequest } from "../types";
import { MongoClient, ObjectId } from "mongodb";
import { MetadataService, MetadataServiceConfiguration } from "./metadataService";
import { VirusScanningService, VirusScanningServiceConfiguration } from "./virusScanningService";

export type EvidenceServiceConfiguration = {
  s3: {
    bucket_quarantine: string,
    bucket_scanned: string,
  }
  // FIXME add other configuration
};

export class EvidenceService {

  readonly configuration: EvidenceServiceConfiguration;
  readonly metaDataService: MetadataService;
  readonly virusScanningService: VirusScanningService;

  constructor(configuration: EvidenceServiceConfiguration, metaDataServiceConfiguration: MetadataServiceConfiguration, virusScanningServiceConfiguration: VirusScanningServiceConfiguration) {
    this.configuration = configuration;
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
      const fileBuffer = Buffer.from(inputParameters.base64_data, "base64");

      const uuid = uuidv4();
      const s3Key = await s3KeyForContent(uuid, inputParameters);

      const scanResults = await this.virusScanningService.scanContentForViruses(fileBuffer);
      if (scanResults.isInfected) {
        return await handleInfectedFile(this.configuration.s3, s3Key, fileBuffer);
      } else {
        return await handleCleanFile(this.metaDataService, this.configuration.s3, inputParameters, s3Key, fileBuffer);
      }
    };

  async fetchDetails(evidenceId: string) {
    const encodedMongoUsername = encodeURIComponent(this.metaDataService.configuration.username);

    const encodedMongoPassword = encodeURIComponent(this.metaDataService.configuration.password);
    
    const mongoConnectionUri = `mongodb://${encodedMongoUsername}:${encodedMongoPassword}@mongo:27017`;

    const client = new MongoClient(mongoConnectionUri);

    const collection = client.db("default").collection("default");

    return await collection.findOne({
      _id: new ObjectId(evidenceId)
    });
  }
}

async function handleInfectedFile(configS3: { bucket_quarantine: any; bucket_scanned?: string; }
  , s3Key:string
  , fileBuffer:Buffer) {
  await uploadFileToS3(
    configS3.bucket_quarantine,
    s3Key,
    fileBuffer
  );
  
  return new Error("File is infected");
}

async function handleCleanFile(metaDataService: MetadataService, configS3: { bucket_quarantine?: string; bucket_scanned: any; }
  , inputParameters: UploadRequest["body"]["input"]["data"]
  , s3Key:string, fileBuffer:Buffer) {
  await uploadFileToS3(
    configS3.bucket_scanned,
    s3Key,
    fileBuffer
  );

  const doc = await metaDataService.storeMetadataInMongo(inputParameters, s3Key);

  return { evidence_id: doc.insertedId.toString() };
}

async function s3KeyForContent(uuid: string, inputParameters: UploadRequest["body"]["input"]["data"]) {
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