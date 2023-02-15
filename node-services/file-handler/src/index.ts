import {
  EvidenceService, EvidenceServiceConfiguration
} from "./services";
import { buildFastifyRoutes, buildFastifyServer, startServer } from "./server";
import { MetadataServiceConfiguration } from "./services/metadataService";
import { VirusScanningServiceConfiguration } from "./services/virusScanningService";

const requiredEnvironment = (name: string): string => {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Environment [${name}] is required, but was not defined, failing.`);
  }
  return value;
}

const evidenceServiceConfiguration: EvidenceServiceConfiguration = {
  s3: {
    bucket_quarantine: requiredEnvironment("QUARANTINE_BUCKET"),
    bucket_scanned: requiredEnvironment("SCANNED_BUCKET"),
  }
  // FIXME other setup goes here.
}

const metaDataServiceConfiguration: MetadataServiceConfiguration = {
  username: requiredEnvironment("MONGO_INITDB_ROOT_USERNAME"),
  password: requiredEnvironment("MONGO_INITDB_ROOT_PASSWORD"),
}

const virusScanningServiceConfiguration: VirusScanningServiceConfiguration = {
  host: requiredEnvironment("CLAMAV_HOST"),
  port: requiredEnvironment("CLAMAV_PORT"),
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
buildFastifyServer(
  parseInt(requiredEnvironment("MAXIMUM_FILE_UPLOAD_SIZE")),
).
then((fastify) => {
  const evidenceService = new EvidenceService(evidenceServiceConfiguration, metaDataServiceConfiguration, virusScanningServiceConfiguration);
  buildFastifyRoutes(fastify, evidenceService);
  return fastify;
}).
then((fastify) => startServer(fastify));