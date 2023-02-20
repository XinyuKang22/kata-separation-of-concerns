import { z } from "zod";

export const UploadRequestSchema = z.object({
    body: z.object({
        action: z.object({
            name: z.string(),
        }),
        input: z.object({
            data: z.object({
                filename: z.string(),
                base64_data: z.string(),
                name: z.string(),
                description: z.string()
            })
        })
    }),
});