import "server-only";
import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;

// The raw token only ever lives in the cookie or the setup link. The database keeps its hash.
export function newSecretToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashSecretToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
