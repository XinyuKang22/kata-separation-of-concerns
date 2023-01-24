import {
  EvidenceService,
} from "./services";
import { buildFastifyServer, startServer } from "./server";

const evidenceService = new EvidenceService();

const fastify = buildFastifyServer(
  parseInt(process.env["MAXIMUM_FILE_UPLOAD_SIZE"] || ""),
  evidenceService
);

// eslint-disable-next-line @typescript-eslint/no-floating-promises
startServer(fastify);
