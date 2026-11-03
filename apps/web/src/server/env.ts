import "server-only";
import { z } from "zod";

const ENCRYPTION_KEY_BYTES = 32;

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  PIPELINE_URL: z.string().url(),
  APP_URL: z.string().url(),
  // Absolute path, so the web app and the pipeline worker find the same files.
  STORAGE_DIR: z.string().min(1),
  FILE_ENCRYPTION_KEY: z
    .string()
    .refine((keyBase64) => Buffer.from(keyBase64, "base64").length === ENCRYPTION_KEY_BYTES, {
      message: "FILE_ENCRYPTION_KEY must be 32 bytes, base64 encoded",
    }),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function readServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Server environment is incomplete: ${result.error.message}`);
  }
  return result.data;
}
