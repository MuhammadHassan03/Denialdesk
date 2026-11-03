import "server-only";
import { eq } from "drizzle-orm";
import { db } from "../client";
import { denials } from "../schema";

export type DenialRow = typeof denials.$inferSelect;

export async function findDenialById(denialId: string): Promise<DenialRow | undefined> {
  const rows = await db.select().from(denials).where(eq(denials.id, denialId)).limit(1);
  return rows[0];
}
