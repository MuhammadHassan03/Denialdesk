import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../client";
import { auditEvents } from "../schema";

export const HISTORY_PAGE_SIZE = 20;

const historyRowSchema = z.object({
  id: z.string().uuid(),
  actor: z.enum(["user", "system"]),
  action: z.string(),
  draftVersion: z.number().int().nullable(),
  createdAt: z.date(),
});

export type DenialHistoryRow = z.infer<typeof historyRowSchema>;

// Newest first. The page shows the latest 20 (F13).
export async function listDenialHistory(
  database: Database,
  organizationId: string,
  denialId: string,
): Promise<DenialHistoryRow[]> {
  const rows = await database
    .select({
      id: auditEvents.id,
      actor: auditEvents.actor,
      action: auditEvents.action,
      draftVersion: auditEvents.draftVersion,
      createdAt: auditEvents.createdAt,
    })
    .from(auditEvents)
    .where(and(eq(auditEvents.organizationId, organizationId), eq(auditEvents.denialId, denialId)))
    .orderBy(desc(auditEvents.createdAt))
    .limit(HISTORY_PAGE_SIZE);
  return z.array(historyRowSchema).parse(rows);
}
