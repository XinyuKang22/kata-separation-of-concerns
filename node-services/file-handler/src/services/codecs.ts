import { Errors } from "../services";
import { z } from "zod";
import { DownloadRequest, UploadRequest } from "../types";

const action: z.ZodType<UploadRequest["body"]["action"]> = z.object({
  name: z.string(),
});

const uploadInputData: z.ZodType<UploadRequest["body"]["input"]["data"]> =
  z.object({
    filename: z.string(),
    base64_data: z.string(),
    name: z.string(),
    description: z.string(),
  });

const uploadInput: z.ZodType<UploadRequest["body"]["input"]> = z.object({
  data: uploadInputData,
});

const uploadRequestBody: z.ZodType<UploadRequest["body"]> = z.object({
  action: action,
  input: uploadInput,
});

const uploadRequestParser: z.ZodType<UploadRequest> = z.object({
  body: uploadRequestBody,
});

const downloadInputData: z.ZodType<DownloadRequest["body"]["input"]["data"]> =
  z.object({
    evidence_id: z.string(),
  });

const downloadInput: z.ZodType<DownloadRequest["body"]["input"]> = z.object({
  data: downloadInputData,
});

const downloadRequestBody: z.ZodType<DownloadRequest["body"]> = z.object({
  action: action,
  input: downloadInput,
});

const downloadRequestParser: z.ZodType<DownloadRequest> = z.object({
  body: downloadRequestBody,
});

/**
 * Converts an unknown object into an Upload Request or an error
 *
 * @param request an unknown object
 * @returns A type-safe UploadRequest or an Error
 */
export const parseUploadRequestBody = (
  request: unknown
): UploadRequest | Errors => {
  const parsedRequestBody = uploadRequestParser.safeParse(request);

  if (!parsedRequestBody.success) {
    return { errors: [`Failed to parse request [${JSON.stringify(parsedRequestBody.error)}].`] };
  }
  return parsedRequestBody.data;
};

/**
 * Converts an unknown object into an Download Request or an error
 *
 * @param request an unknown object
 * @returns A type-safe UploadRequest or an Error
 */
export const parseDownloadRequestBody = (
  request: unknown
): DownloadRequest | Errors => {
  const parsedRequestBody = downloadRequestParser.safeParse(request);

  if (!parsedRequestBody.success) {
    return { errors: ["Failed to parse request."] };
  }
  return parsedRequestBody.data;
};
