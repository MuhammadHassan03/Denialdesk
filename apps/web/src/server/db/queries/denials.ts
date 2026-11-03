import "server-only";
import { and, asc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { DENIAL_STATUSES } from "@/lib/denial-status";
import type { Database } from "../client";
import { db } from "../client";
import { denials, payers, remittances } from "../schema";

export type DenialRow = typeof denials.$inferSelect;

export async function findDenialById(denialId: string): Promise<DenialRow | undefined> {
  const rows = await db.select().from(denials).where(eq(denials.id, denialId)).limit(1);
  return rows[0];
}

const denialDetailSchema = z.object({
  id: z.string().uuid(),
  remittanceId: z.string().uuid(),
  payerName: z.string(),
  sourceFilename: z.string(),
  patientControlNumber: z.string(),
  payerClaimControlNumber: z.string(),
  groupCode: z.string(),
  carcCode: z.string(),
  rarcCodes: z.array(z.string()),
  serviceLineRef: z.string(),
  procedureCode: z.string().nullable(),
  procedureModifiers: z.array(z.string()),
  lineChargeCents: z.number().int().nullable(),
  linePaidCents: z.number().int().nullable(),
  claimChargeCents: z.number().int(),
  claimPaidCents: z.number().int(),
  amountAtStakeCents: z.number().int(),
  serviceDate: z.string().nullable(),
  appealDeadline: z.string(),
  deadlineIsEstimate: z.boolean(),
  status: z.enum(DENIAL_STATUSES),
});

export type DenialDetailRow = z.infer<typeof denialDetailSchema>;

// Scoped to the organization: a denial from another organization reads as not found.
export async function findDenialDetail(
  database: Database,
  organizationId: string,
  denialId: string,
): Promise<DenialDetailRow | null> {
  const rows = await database
    .select({
      id: denials.id,
      remittanceId: denials.remittanceId,
      payerName: payers.name,
      sourceFilename: remittances.originalFilename,
      patientControlNumber: denials.patientControlNumber,
      payerClaimControlNumber: denials.payerClaimControlNumber,
      groupCode: denials.groupCode,
      carcCode: denials.carcCode,
      rarcCodes: denials.rarcCodes,
      serviceLineRef: denials.serviceLineRef,
      procedureCode: denials.procedureCode,
      procedureModifiers: denials.procedureModifiers,
      lineChargeCents: denials.lineChargeCents,
      linePaidCents: denials.linePaidCents,
      claimChargeCents: denials.claimChargeCents,
      claimPaidCents: denials.claimPaidCents,
      amountAtStakeCents: denials.amountAtStakeCents,
      serviceDate: denials.serviceDate,
      appealDeadline: denials.appealDeadline,
      deadlineIsEstimate: denials.deadlineIsEstimate,
      status: denials.status,
    })
    .from(denials)
    .innerJoin(payers, eq(payers.id, denials.payerId))
    .innerJoin(remittances, eq(remittances.id, denials.remittanceId))
    .where(and(eq(denials.organizationId, organizationId), eq(denials.id, denialId)))
    .limit(1);
  if (rows[0] === undefined) {
    return null;
  }
  return denialDetailSchema.parse(rows[0]);
}

const siblingDenialSchema = z.object({
  id: z.string().uuid(),
  groupCode: z.string(),
  carcCode: z.string(),
});

// Several reason codes on one claim are separate denials (F3); the page links the others.
export async function listOtherDenialsOnClaim(
  database: Database,
  organizationId: string,
  denial: { id: string; payerClaimControlNumber: string },
): Promise<z.infer<typeof siblingDenialSchema>[]> {
  const rows = await database
    .select({ id: denials.id, groupCode: denials.groupCode, carcCode: denials.carcCode })
    .from(denials)
    .where(
      and(
        eq(denials.organizationId, organizationId),
        eq(denials.payerClaimControlNumber, denial.payerClaimControlNumber),
        ne(denials.id, denial.id),
      ),
    )
    .orderBy(asc(denials.carcCode));
  return z.array(siblingDenialSchema).parse(rows);
}
