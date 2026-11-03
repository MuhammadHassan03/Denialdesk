import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../client";
import { sessions } from "../schema";

const sessionRowSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  lastSeenAt: z.date(),
});

export type SessionRow = z.infer<typeof sessionRowSchema>;

export async function insertSession(
  database: Database,
  userId: string,
  tokenHash: string,
): Promise<void> {
  await database.insert(sessions).values({ userId, tokenHash });
}

export async function findSessionByTokenHash(
  database: Database,
  tokenHash: string,
): Promise<SessionRow | null> {
  const rows = await database
    .select({ id: sessions.id, userId: sessions.userId, lastSeenAt: sessions.lastSeenAt })
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);
  const sessionRow = rows[0];
  if (sessionRow === undefined) {
    return null;
  }
  return sessionRowSchema.parse(sessionRow);
}

export async function touchSession(database: Database, sessionId: string): Promise<void> {
  await database.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, sessionId));
}

export async function deleteSession(database: Database, sessionId: string): Promise<void> {
  await database.delete(sessions).where(eq(sessions.id, sessionId));
}
