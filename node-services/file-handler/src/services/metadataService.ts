import { MongoClient, ObjectId } from "mongodb";
import { UploadRequest } from "../types";

export type MetadataServiceConfiguration = {
    username: string,
    password: string,
};

export class MetadataService {

  readonly configuration: MetadataServiceConfiguration;
  readonly client;

  constructor(configuration: MetadataServiceConfiguration) {
    this.configuration = configuration;

    const encodedMongoUsername = encodeURIComponent(this.configuration.username);
    const encodedMongoPassword = encodeURIComponent(this.configuration.password);
    const mongoConnectionUri = `mongodb://${encodedMongoUsername}:${encodedMongoPassword}@mongo:27017`;
    this.client = new MongoClient(mongoConnectionUri);
    
  }

  async storeMetadataInMongo(inputParameters: UploadRequest["body"]["input"]["data"], s3Key:string) {
  
    await this.client.db("admin").command({ping: 1});
  
    const collection = await this.client.db("default").collection("default");
  
    const doc = await collection.insertOne({
      ...inputParameters,
      s3Key,
      infected: false
    });
  
    return doc;
  }

  async fetchDetails(evidenceId: string) {

    const collection = this.client.db("default").collection("default");

    return await collection.findOne({
      _id: new ObjectId(evidenceId)
    });
  }
}