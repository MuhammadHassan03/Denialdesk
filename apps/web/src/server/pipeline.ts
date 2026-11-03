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

const codeMeaningSchema = z.object({
  code: z.string(),
  official_text: z.string(),
  plain_english: z.string(),
  supported: z.boolean(),
});

export type CodeMeaning = {
  code: string;
  plainEnglish: string;
  supported: boolean;
};

const HTTP_NOT_FOUND = 404;

// A plain-English meaning for one denial code such as "CO-197". Null when the
// pipeline has no meaning for it, so the page can say so in words.
export async function fetchCodeMeaning(code: string): Promise<CodeMeaning | null> {
  const env = readServerEnv();
  const response = await fetch(`${env.PIPELINE_URL}/codes/${encodeURIComponent(code)}`, {
    cache: "no-store",
  });
  if (response.status === HTTP_NOT_FOUND) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Code lookup failed with HTTP ${response.status}`);
  }
  const responseBody: unknown = await response.json();
  const meaning = codeMeaningSchema.parse(responseBody);
  return { code: meaning.code, plainEnglish: meaning.plain_english, supported: meaning.supported };
}
