import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
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

// Next.js only reads .env files from apps/web, but the repo keeps one shared .env at
// its root. The load in next.config.ts doesn't always reach the process that renders
// pages, so load the root file here when the variables are missing. Variables that
// are already set are never overwritten.
function loadRootEnvFile(): void {
  const rootEnvPath = path.resolve(process.cwd(), "../../.env");
  if (existsSync(rootEnvPath)) {
    process.loadEnvFile(rootEnvPath);
  }
}

export function readServerEnv(): ServerEnv {
  let result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    loadRootEnvFile();
    result = serverEnvSchema.safeParse(process.env);
  }
  if (!result.success) {
    throw new Error(`Server environment is incomplete: ${result.error.message}`);
  }
  return result.data;
}

// The database URL alone, or null when it isn't set. Unlike readServerEnv this never throws,
// so a build on a host that has no database yet can still import the database client.
export function readDatabaseUrl(): string | null {
  if (process.env.DATABASE_URL === undefined) {
    loadRootEnvFile();
  }
  return process.env.DATABASE_URL ?? null;
}
