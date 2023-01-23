import {
  AwsService,
  ClamAVService,
  readConfig,
  EvidenceService,
} from "./services";
import { buildFastifyServer, startServer } from "./server";
import NodeClam from "clamscan";
import { S3ClientConfig } from "@aws-sdk/client-s3";
import { envalidErrorFormatter } from "envalid";

const maybeConfig = readConfig(process.env);

if ("errors" in maybeConfig) {
  envalidErrorFormatter(maybeConfig.errors);
  process.exit(1);
}

const config = maybeConfig.config;

const s3Config: S3ClientConfig = config.PRODUCTION_DEPLOYMENT
  ? {
      region: config.AWS_DEFAULT_REGION,
      forcePathStyle: true,
    }
  : {
      region: config.AWS_DEFAULT_REGION,
      forcePathStyle: true,
      endpoint: "http://localstack-service:4566",
      credentials: {
        accessKeyId: "test",
        secretAccessKey: "test",
      },
    };

const clamAVOptions: NodeClam.Options = {
  debugMode: false,
  clamscan: {
    active: false,
  },
  clamdscan: {
    host: "clamav",
    port: 3310,
    localFallback: false,
  },
};

/**
 * During development we are calling localstack from within our kubernetes cluster so
 * we get a url that is relative to the localstack (Kube) Service name. We must change this to
 * be something that can be access outside of the cluster so that it can be used in a browser.
 * This does not impact AWS deployments as it uses a cloud s3 bucket which is outside of the cluster.
 **/
const signedUrlPostProcessor = config.PRODUCTION_DEPLOYMENT
  ? (signedUrl: string) => signedUrl
  : (signedUrl: string) =>
      signedUrl.replace(
        "http://localstack-service:4566",
        "http://localhost:4566"
      );

const awsService = new AwsService(config.SCANNED_BUCKET, s3Config);
const virusScannerService = new ClamAVService(clamAVOptions);
const evidenceService = new EvidenceService(
  config.QUARANTINE_BUCKET,
  config.SCANNED_BUCKET,
  awsService,
  virusScannerService,
  signedUrlPostProcessor
);

const fastify = buildFastifyServer(
  config.MAXIMUM_FILE_UPLOAD_SIZE,
  evidenceService
);

// eslint-disable-next-line @typescript-eslint/no-floating-promises
startServer(fastify);
