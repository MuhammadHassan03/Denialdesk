import "server-only";
import type { Database } from "../client";
import { auditAction, auditEvents } from "../schema";

export type AuditAction = (typeof auditAction.enumValues)[number];

// Details hold references and small facts only, never claim contents or patient details.
export type AuditDetails = Record<string, string | number | boolean | null>;

export type NewAuditEvent = {
  organizationId: string | null;
  userId: string | null;
  action: AuditAction;
  denialId?: string;
  remittanceId?: string;
  draftVersion?: number;
  details?: AuditDetails;
};

// Audit rows are append-only: there is no update or delete here, and the database rejects both.
export async function insertAuditEvent(database: Database, event: NewAuditEvent): Promise<void> {
  const actor = event.userId === null ? "system" : "user";
  await database.insert(auditEvents).values({
    organizationId: event.organizationId,
    actor,
    userId: event.userId,
    action: event.action,
    denialId: event.denialId,
    remittanceId: event.remittanceId,
    draftVersion: event.draftVersion,
    details: event.details ?? {},
  });
}
