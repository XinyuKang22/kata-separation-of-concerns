import { z } from "zod";
import { UploadRequestSchema } from "./codecs";

export type UploadRequest = z.infer<typeof UploadRequestSchema>;
