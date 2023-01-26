import { Readable } from "stream";
import { v4 as uuidv4 } from "uuid";
import http from "http";
import { FastifyBaseLogger } from "fastify";
import { chainableError, uploadFileToS3 } from ".";
import { UploadRequest } from "../types";
import NodeClam from "clamscan";
import { MongoClient, ObjectId } from "mongodb";

export class EvidenceService {

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
      const currentDate = new Date();
      const dateString =
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        currentDate.getFullYear() +
        "/" +
        (currentDate.getMonth() + 1) +
        "/" +
        currentDate.getDate();
      const s3Key = dateString + "/" + uuid + "/" + inputParameters.filename;

      const tempOptions = { 
        debugMode: false,
        clamscan: {
          active: false,
        },
        clamdscan: {
          host: process.env["CLAMAV_HOST"],
          port: parseInt(process.env["CLAMAV_PORT"] || ""),
          localFallback: false,
        }
        };
      const clamScan = await new NodeClam().init(tempOptions);

      const scanResults = await clamScan.scanStream(Readable.from(fileBuffer));
      if (scanResults.isInfected) {

        await uploadFileToS3(
          process.env["QUARANTINE_BUCKET"] || "",
          s3Key,
          fileBuffer
        );

        return new Error("File is infected");
      } else {
    
        await uploadFileToS3(
          process.env["SCANNED_BUCKET"] || "",
          s3Key,
          fileBuffer
        );

        const encodedMongoUsername = encodeURIComponent(process.env["MONGO_INITDB_ROOT_USERNAME"] || "");

        const encodedMongoPassword = encodeURIComponent(process.env["MONGO_INITDB_ROOT_PASSWORD"] || "");
        
        const mongoConnectionUri = `mongodb://${encodedMongoUsername}:${encodedMongoPassword}@mongo:27017`;

        const client = new MongoClient(mongoConnectionUri);

        await client.db("admin").command({ping: 1});

        const collection = await client.db("default").collection("default");
        
        const doc = await collection.insertOne({
          ...inputParameters,
          s3Key,
          infected: false
        });

        return { evidence_id: doc.insertedId.toString() };
      }
    };

  async fetchDetails(evidenceId: string) {
    const encodedMongoUsername = encodeURIComponent(process.env["MONGO_INITDB_ROOT_USERNAME"] || "");

    const encodedMongoPassword = encodeURIComponent(process.env["MONGO_INITDB_ROOT_PASSWORD"] || "");
    
    const mongoConnectionUri = `mongodb://${encodedMongoUsername}:${encodedMongoPassword}@mongo:27017`;

    const client = new MongoClient(mongoConnectionUri);

    const collection = await client.db("default").collection("default");

    return await collection.findOne({
      _id: new ObjectId(evidenceId)
    });
  }
}
