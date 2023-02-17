import { buildFastifyRoutes, buildFastifyServer, startServer } from "./server";
import { EvidenceServiceConfiguration, MetadataServiceConfiguration, VirusScanningServiceConfiguration, EvidenceService } from "./services";

const requiredEnvironment = (name: string): string => {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Environment [${name}] is required, but was not defined, failing.`);
  }
  return value;
}

const evidenceServiceConfiguration: EvidenceServiceConfiguration = {
  bucket_quarantine: requiredEnvironment("QUARANTINE_BUCKET"),
  bucket_scanned: requiredEnvironment("SCANNED_BUCKET"),
}

const metaDataServiceConfiguration: MetadataServiceConfiguration = {
  username: requiredEnvironment("MONGO_INITDB_ROOT_USERNAME"),
  password: requiredEnvironment("MONGO_INITDB_ROOT_PASSWORD"),
}

const virusScanningServiceConfiguration: VirusScanningServiceConfiguration = {
  host: requiredEnvironment("CLAMAV_HOST"),
  port: Number(requiredEnvironment("CLAMAV_PORT")),
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
buildFastifyServer(
  parseInt(requiredEnvironment("MAXIMUM_FILE_UPLOAD_SIZE")),
).
then((fastifyWithMetrics) => {

  const numberOfCleanFilesScanned = new fastifyWithMetrics.metrics.client.Counter(
    {
      name: "clean_files_count",
      help: "The number of clean files that have been scanned by the service."
    }
  );

  const numberOfInfectedFilesDetected = new fastifyWithMetrics.metrics.client.Counter(
    {
      name: "infected_files_count",
      help: "The number of infected files that have been deteced by the service."
    }
  )

  const sizeOfContentUploadedToS3 = new fastifyWithMetrics.metrics.client.Histogram(
    {
      name: "content_size_uploaded_to_S3",
      help: "The histogram that track the size of content uploaded to S3",
      buckets: [5, 15, 50, 100, 500],
    }
  )

  const evidenceService = new EvidenceService(
    () => numberOfCleanFilesScanned.inc(), 
    () => numberOfInfectedFilesDetected.inc(), 
    (value: number) => sizeOfContentUploadedToS3.observe(value),
    evidenceServiceConfiguration, 
    metaDataServiceConfiguration, 
    virusScanningServiceConfiguration);

  buildFastifyRoutes(fastifyWithMetrics, evidenceService);
  return fastifyWithMetrics;
}).
then((fastify) => startServer(fastify));