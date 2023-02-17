import Fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import metricsPlugin, { IFastifyMetrics } from "fastify-metrics";
import { EvidenceService } from "../services";
import { UploadRequest } from "../types";

export const buildFastifyServer = async (
  maximum_upload_size: number
): Promise<FastifyInstance & {
  metrics: IFastifyMetrics
}> => 
{
  const fastify = await Fastify({
    logger: true,
    requestIdHeader: "x-request-id",
    bodyLimit: maximum_upload_size,
  });
  await fastify.register(metricsPlugin);
  return fastify;
}

export const buildFastifyRoutes = (
  fastify: FastifyInstance,
  evidenceService: EvidenceService
) => {

  const logger = fastify.log;

  const sendErrorReply = (reply: FastifyReply) => async (error: Error) => {
    fastify.log.error(error);

    await reply.status(500).send({ message: error.message });
  };

  /**
   * Health check endpoint to verify that fastify is running
   */
  fastify.get("/hc", () => {
    return { status: "ok" };
  });

  /**
   * Upload endpoint which handles scanning files using clamav and
   * storing them on s3.
   */
  fastify.post(
    "/upload",
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<
      {
        evidence_id: string;
      }
      | undefined
    > => {

      const uploadRequest = request as UploadRequest;

      const requestLogger = logger.child({
        contentName: uploadRequest.body.input.data.filename,
        contentSize: uploadRequest.body.input.data.base64_data.length,
      });

      const processResult = await evidenceService.fileUpload(
        uploadRequest.body.input.data,
        request.headers,
        requestLogger
      );

      if (processResult instanceof Error) {
        await sendErrorReply(reply)(processResult);
        return;
      }

      return processResult;
    }
  );

  fastify.get(
    "/evidence/:evidenceId", async (request, reply) => {
      const { evidenceId } = request.params as { evidenceId: string};

      return await evidenceService.fetchDetails(evidenceId);
    }
  )

  return fastify;
};

/** Run the server. */
export const startServer = async (
  fastify: FastifyInstance,
  host = "0.0.0.0",
  port = 4002
) => {
  try {
    await fastify.listen({ port, host });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
