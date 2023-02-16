import { MongoClient, ObjectId } from "mongodb";
import { UploadRequest } from "../types";

export type MetadataServiceConfiguration = {
    username: string,
    password: string,
};

export class MetadataService {

  readonly configuration: MetadataServiceConfiguration;

  constructor(configuration: MetadataServiceConfiguration) {
    this.configuration = configuration;
  }

  async storeMetadataInMongo(inputParameters: UploadRequest["body"]["input"]["data"], s3Key:string) {
    const encodedMongoUsername = encodeURIComponent(this.configuration.username);
  
    const encodedMongoPassword = encodeURIComponent(this.configuration.password);
    
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

  async fetchDetails(evidenceId: string) {
    const encodedMongoUsername = encodeURIComponent(this.configuration.username);

    const encodedMongoPassword = encodeURIComponent(this.configuration.password);

    const mongoConnectionUri = `mongodb://${encodedMongoUsername}:${encodedMongoPassword}@mongo:27017`;

    const client = new MongoClient(mongoConnectionUri);

    const collection = client.db("default").collection("default");

    return await collection.findOne({
      _id: new ObjectId(evidenceId)
    });
  }
}