import { MongoClient, ObjectId } from "mongodb";
import { UploadRequest } from "../types";

export type MetadataServiceConfiguration = {
    mongo: {
        username: string,
        password: string,
      },
    s3: {
        bucket_quarantine: string,
        bucket_scanned: string,
      }
};

export class MetadataService {

  readonly configuration: MetadataServiceConfiguration;

  constructor(configuration: MetadataServiceConfiguration) {
    this.configuration = configuration;
  }

  async storeMetadataInMongo(inputParameters: UploadRequest["body"]["input"]["data"], s3Key:string) {
    const encodedMongoUsername = encodeURIComponent(this.configuration.mongo.username);
  
    const encodedMongoPassword = encodeURIComponent(this.configuration.mongo.password);
    
    const mongoConnectionUri = `mongodb://${encodedMongoUsername}:${encodedMongoPassword}@mongo:27017`;
  
    const client = new MongoClient(mongoConnectionUri);
  
    await client.db("admin").command({ping: 1});
  
    const collection = await client.db("default").collection("default");
  
    const doc = await collection.insertOne({
      ...inputParameters,
      s3Key,
      infected: false
    });
  
    return doc;
  }
}