import "server-only";
import { randomBytes } from "node:crypto";

const ERROR_ID_BYTES = 6;

export function newErrorId(): string {
  return randomBytes(ERROR_ID_BYTES).toString("hex");
}

type LogReferences = Record<string, string | number | boolean | null>;

// Logs carry ids and counts only. Never names, member ids or claim contents.
export function logServerError(
  event: string,
  errorId: string,
  references: LogReferences,
  error: unknown,
) {
  const errorType = error instanceof Error ? error.name : typeof error;
  console.error(JSON.stringify({ level: "error", event, errorId, errorType, ...references }));
}

export function logServerEvent(event: string, references: LogReferences) {
  console.info(JSON.stringify({ level: "info", event, ...references }));
}
