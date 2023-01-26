import Fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { EvidenceService } from "../services";
import { UploadRequest } from "../types";

export const buildFastifyServer = async (
  maximum_upload_size: number
): Promise<FastifyInstance> => {
  const fastify = await Fastify({
    logger: true,
    requestIdHeader: "x-request-id",
    bodyLimit: maximum_upload_size,
  });

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

      const processResult = await evidenceService.fileUpload(
        uploadRequest.body.input.data,
        request.headers,
        logger
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
