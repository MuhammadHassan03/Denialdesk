import "server-only";
import { z } from "zod";
import { readServerEnv } from "./env";

// The only place the web app calls the Python pipeline API.

const pipelineHealthSchema = z.object({
  status: z.literal("ok"),
});

export type PipelineHealth = z.infer<typeof pipelineHealthSchema>;

export async function fetchPipelineHealth(): Promise<PipelineHealth> {
  const env = readServerEnv();
  const response = await fetch(`${env.PIPELINE_URL}/health`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Pipeline health check failed with HTTP ${response.status}`);
  }
  const responseBody: unknown = await response.json();
  return pipelineHealthSchema.parse(responseBody);
}
