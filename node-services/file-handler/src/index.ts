import {
  EvidenceService,
} from "./services";
import { buildFastifyRoutes, buildFastifyServer, startServer } from "./server";

// eslint-disable-next-line @typescript-eslint/no-floating-promises
buildFastifyServer(
  parseInt(process.env["MAXIMUM_FILE_UPLOAD_SIZE"] || ""),
).
then((fastify) => {
  const evidenceService = new EvidenceService();
  buildFastifyRoutes(fastify, evidenceService);
  return fastify;
}).
then((fastify) => startServer(fastify));