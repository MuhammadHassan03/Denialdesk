import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../client";
import { remittances } from "../schema";

export const RECENT_UPLOADS_LIMIT = 50;

const resultSummarySchema = z.object({
  claims_total: z.number().int(),
  claims_without_denials: z.number().int(),
  already_in_queue: z.number().int(),
  reversals_seen: z.number().int(),
  denials_created: z.number().int(),
});

const remittanceRowSchema = z.object({
  id: z.string().uuid(),
  source: z.enum(["835", "EOB"]),
  status: z.enum(["queued", "processing", "done", "done_with_warnings", "failed"]),
  originalFilename: z.string(),
  denialCount: z.number().int().nullable(),
  resultSummary: resultSummarySchema.nullable(),
  billerMessage: z.string().nullable(),
  errorId: z.string().nullable(),
  createdAt: z.date(),
});

export type RemittanceRow = z.infer<typeof remittanceRowSchema>;

const remittanceColumns = {
  id: remittances.id,
  source: remittances.source,
  status: remittances.status,
  originalFilename: remittances.originalFilename,
  denialCount: remittances.denialCount,
  resultSummary: remittances.resultSummary,
  billerMessage: remittances.billerMessage,
  errorId: remittances.errorId,
  createdAt: remittances.createdAt,
};

export async function listRecentRemittances(
  database: Database,
  organizationId: string,
): Promise<RemittanceRow[]> {
  const rows = await database
    .select(remittanceColumns)
    .from(remittances)
    .where(eq(remittances.organizationId, organizationId))
    .orderBy(desc(remittances.createdAt))
    .limit(RECENT_UPLOADS_LIMIT);
  return z.array(remittanceRowSchema).parse(rows);
}

export async function findRemittanceByHash(
  database: Database,
  organizationId: string,
  sha256: string,
): Promise<RemittanceRow | null> {
  const rows = await database
    .select(remittanceColumns)
    .from(remittances)
    .where(and(eq(remittances.organizationId, organizationId), eq(remittances.sha256, sha256)))
    .limit(1);
  const remittanceRow = rows[0];
  if (remittanceRow === undefined) {
    return null;
  }
  return remittanceRowSchema.parse(remittanceRow);
}

export async function findRemittanceById(
  database: Database,
  organizationId: string,
  remittanceId: string,
): Promise<RemittanceRow | null> {
  const rows = await database
    .select(remittanceColumns)
    .from(remittances)
    .where(and(eq(remittances.organizationId, organizationId), eq(remittances.id, remittanceId)))
    .limit(1);
  const remittanceRow = rows[0];
  if (remittanceRow === undefined) {
    return null;
  }
  return remittanceRowSchema.parse(remittanceRow);
}

export type NewRemittance = {
  organizationId: string;
  uploadedByUserId: string;
  source: "835" | "EOB";
  sha256: string;
  originalFilename: string;
  storageUri: string;
};

export async function insertRemittance(
  database: Database,
  newRemittance: NewRemittance,
): Promise<string> {
  const inserted = await database
    .insert(remittances)
    .values(newRemittance)
    .returning({ id: remittances.id });
  return z.string().uuid().parse(inserted[0]?.id);
}

export async function markRemittanceQueued(
  database: Database,
  remittanceId: string,
): Promise<void> {
  await database
    .update(remittances)
    .set({ status: "queued", billerMessage: null, errorId: null, updatedAt: new Date() })
    .where(eq(remittances.id, remittanceId));
}
