import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../client";
import { userSetupTokens } from "../schema";

const setupTokenRowSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  expiresAt: z.date(),
  usedAt: z.date().nullable(),
});

export type SetupTokenRow = z.infer<typeof setupTokenRowSchema>;

export async function insertSetupToken(
  database: Database,
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await database.insert(userSetupTokens).values({ userId, tokenHash, expiresAt });
}

export async function findSetupTokenByHash(
  database: Database,
  tokenHash: string,
): Promise<SetupTokenRow | null> {
  const rows = await database
    .select({
      id: userSetupTokens.id,
      userId: userSetupTokens.userId,
      expiresAt: userSetupTokens.expiresAt,
      usedAt: userSetupTokens.usedAt,
    })
    .from(userSetupTokens)
    .where(eq(userSetupTokens.tokenHash, tokenHash))
    .limit(1);
  const tokenRow = rows[0];
  if (tokenRow === undefined) {
    return null;
  }
  return setupTokenRowSchema.parse(tokenRow);
}

export async function markSetupTokenUsed(database: Database, tokenId: string): Promise<void> {
  await database
    .update(userSetupTokens)
    .set({ usedAt: new Date() })
    .where(eq(userSetupTokens.id, tokenId));
}
