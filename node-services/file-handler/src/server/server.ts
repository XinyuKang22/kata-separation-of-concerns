import Fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import {
  parseUploadRequestBody,
} from "../services/codecs";
import { isErrors } from "../services";
import { EvidenceService } from "../services";

export const buildFastifyServer = (
  maximum_upload_size: number,
  evidenceService: EvidenceService
): FastifyInstance => {
  const fastify = Fastify({
    logger: true,
    requestIdHeader: "x-request-id",
    bodyLimit: maximum_upload_size,
  });

  const logger = fastify.log;

  const sendErrorReply = (reply: FastifyReply) => async (message: string) => {
    fastify.log.error({
      message,
    });

    await reply.status(400).send({ message });
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
      | {
          evidence_id: string;
        }
      | undefined
    > => {

      const sendErrorReply_ = sendErrorReply(reply);
      const requestBody = parseUploadRequestBody(request);

      if (isErrors(requestBody)) {
        await sendErrorReply_(requestBody.errors.join(" "));
        return;
      }

      const processResult = await evidenceService.fileUpload(
        requestBody.body.input.data,
        request.headers,
        logger
      );

      if (isErrors(processResult)) {
        await sendErrorReply_(processResult.errors.join(" "));
        return;
      }
      return processResult;
    }
  );

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
