import "server-only";
import { and, count, eq, gte, inArray, lt, sql, sum, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../client";
import { auditEvents, denials } from "../schema";

// Personal stats (F12) read from the audit trail and the denials' current status.
// The timer table doesn't exist yet, so minutes per denial is not computed here.

const DECISION_ACTIONS: ("approved" | "written_off")[] = ["approved", "written_off"];
const NO_RESPONSE_DAYS = 45;

// The calendar day of an audit event in the biller's time zone.
function eventDaySql(timezone: string): SQL<string> {
  return sql<string>`to_char(${auditEvents.createdAt} at time zone ${timezone}, 'YYYY-MM-DD')`;
}

function decisionsSince(
  userId: string,
  timezone: string,
  sinceDay: string | null,
): SQL | undefined {
  let periodCondition: SQL | undefined = undefined;
  if (sinceDay !== null) {
    periodCondition = gte(eventDaySql(timezone), sinceDay);
  }
  return and(
    eq(auditEvents.userId, userId),
    inArray(auditEvents.action, DECISION_ACTIONS),
    periodCondition,
  );
}

const decisionTotalsSchema = z.object({
  decidedCount: z.coerce.number().int(),
  approvedCents: z.coerce.number().int(),
  approvedCount: z.coerce.number().int(),
  writtenOffCents: z.coerce.number().int(),
  writtenOffCount: z.coerce.number().int(),
});

export type DecisionTotals = z.infer<typeof decisionTotalsSchema>;

export async function sumDecisions(
  database: Database,
  userId: string,
  timezone: string,
  sinceDay: string | null,
): Promise<DecisionTotals> {
  const rows = await database
    .select({
      decidedCount: sql`count(distinct ${auditEvents.denialId})`,
      approvedCents: sql`coalesce(sum(${denials.amountAtStakeCents}) filter (where ${auditEvents.action} = 'approved'), 0)`,
      approvedCount: sql`count(*) filter (where ${auditEvents.action} = 'approved')`,
      writtenOffCents: sql`coalesce(sum(${denials.amountAtStakeCents}) filter (where ${auditEvents.action} = 'written_off'), 0)`,
      writtenOffCount: sql`count(*) filter (where ${auditEvents.action} = 'written_off')`,
    })
    .from(auditEvents)
    .innerJoin(denials, eq(denials.id, auditEvents.denialId))
    .where(decisionsSince(userId, timezone, sinceDay));
  return decisionTotalsSchema.parse(rows[0]);
}

const dailyCountSchema = z.object({ day: z.string(), total: z.coerce.number().int() });

export async function countDecisionsPerDay(
  database: Database,
  userId: string,
  timezone: string,
  sinceDay: string,
): Promise<z.infer<typeof dailyCountSchema>[]> {
  const eventDay = eventDaySql(timezone);
  const rows = await database
    .select({ day: eventDay, total: sql`count(distinct ${auditEvents.denialId})` })
    .from(auditEvents)
    .where(decisionsSince(userId, timezone, sinceDay))
    // Group by the first column, not by eventDay again: each use of eventDay sends the
    // timezone as a new query parameter, and Postgres won't treat $1 and $7 as the same
    // expression, so "GROUP BY <same expression>" fails.
    .groupBy(sql`1`);
  return z.array(dailyCountSchema).parse(rows);
}

const outcomeTotalsSchema = z.object({
  status: z.enum(["submitted", "paid", "denied_again"]),
  total: z.coerce.number().int(),
  amountCents: z.coerce.number().int(),
});

export type OutcomeTotals = z.infer<typeof outcomeTotalsSchema>;

export async function sumOutcomes(
  database: Database,
  organizationId: string,
): Promise<OutcomeTotals[]> {
  const rows = await database
    .select({
      status: denials.status,
      total: count(),
      amountCents: sql`coalesce(${sum(denials.amountAtStakeCents)}, 0)`,
    })
    .from(denials)
    .where(
      and(
        eq(denials.organizationId, organizationId),
        inArray(denials.status, ["submitted", "paid", "denied_again"]),
      ),
    )
    .groupBy(denials.status);
  return z.array(outcomeTotalsSchema).parse(rows);
}

// Submitted denials the payer hasn't answered in 45 days, so the biller can follow up.
export async function countSubmittedWithoutResponse(
  database: Database,
  organizationId: string,
  now: Date,
): Promise<number> {
  const cutoff = new Date(now.getTime() - NO_RESPONSE_DAYS * 24 * 60 * 60 * 1000);
  const rows = await database
    .select({ total: count() })
    .from(denials)
    .where(
      and(
        eq(denials.organizationId, organizationId),
        eq(denials.status, "submitted"),
        lt(denials.updatedAt, cutoff),
      ),
    );
  return rows[0]?.total ?? 0;
}

const rejectionReasonSchema = z.object({ reason: z.string(), total: z.coerce.number().int() });

export async function countRejectionReasons(
  database: Database,
  userId: string,
): Promise<z.infer<typeof rejectionReasonSchema>[]> {
  const reasonSql = sql<string>`coalesce(${auditEvents.details} ->> 'reason', 'other')`;
  const rows = await database
    .select({ reason: reasonSql, total: count() })
    .from(auditEvents)
    .where(and(eq(auditEvents.userId, userId), eq(auditEvents.action, "draft_rejected")))
    .groupBy(reasonSql);
  return z.array(rejectionReasonSchema).parse(rows);
}
