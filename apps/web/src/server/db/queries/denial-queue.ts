import "server-only";
import {
  and,
  asc,
  count,
  eq,
  ilike,
  inArray,
  lt,
  lte,
  notInArray,
  or,
  sql,
  sum,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";
import { addDays, DEADLINE_WARNING_DAYS } from "@/lib/dates";
import { DENIAL_STATUSES, OPEN_DENIAL_STATUSES } from "@/lib/denial-status";
import { SUPPORTED_DENIAL_CODES } from "@/lib/denial-codes";
import { OTHER_CODES_FILTER, type QueueFilters } from "@/lib/queue-filters";
import type { Database } from "../client";
import { denials, payers } from "../schema";

export const QUEUE_PAGE_SIZE = 50;
const DUE_WITHIN_30_DAYS = 30;

// "CO-197" in SQL, built the same way as lib/denial-codes.ts denialCode().
const denialCodeSql = sql<string>`${denials.groupCode} || '-' || ${denials.carcCode}`;

const queueRowSchema = z.object({
  id: z.string().uuid(),
  patientControlNumber: z.string(),
  payerName: z.string(),
  groupCode: z.string(),
  carcCode: z.string(),
  amountAtStakeCents: z.number().int(),
  serviceDate: z.string().nullable(),
  appealDeadline: z.string(),
  deadlineIsEstimate: z.boolean(),
  status: z.enum(DENIAL_STATUSES),
});

export type QueueDenialRow = z.infer<typeof queueRowSchema>;

function statusCondition(filters: QueueFilters): SQL | undefined {
  if (filters.status === "all") {
    return undefined;
  }
  if (filters.status === "open") {
    return inArray(denials.status, [...OPEN_DENIAL_STATUSES]);
  }
  return eq(denials.status, filters.status);
}

function codeCondition(filters: QueueFilters): SQL | undefined {
  if (filters.codes.length === 0) {
    return undefined;
  }
  const namedCodes = filters.codes.filter((code) => code !== OTHER_CODES_FILTER);
  const conditions: SQL[] = [];
  if (namedCodes.length > 0) {
    conditions.push(inArray(denialCodeSql, namedCodes));
  }
  if (filters.codes.includes(OTHER_CODES_FILTER)) {
    conditions.push(notInArray(denialCodeSql, [...SUPPORTED_DENIAL_CODES]));
  }
  return or(...conditions);
}

function dueCondition(filters: QueueFilters, today: string): SQL | undefined {
  if (filters.due === "overdue") {
    return lt(denials.appealDeadline, today);
  }
  if (filters.due === "7") {
    return lte(denials.appealDeadline, addDays(today, DEADLINE_WARNING_DAYS));
  }
  if (filters.due === "30") {
    return lte(denials.appealDeadline, addDays(today, DUE_WITHIN_30_DAYS));
  }
  return undefined;
}

function searchCondition(filters: QueueFilters): SQL | undefined {
  if (filters.search === "") {
    return undefined;
  }
  const pattern = `%${filters.search}%`;
  return or(
    ilike(denials.patientControlNumber, pattern),
    ilike(denials.payerClaimControlNumber, pattern),
  );
}

function queueConditions(
  organizationId: string,
  filters: QueueFilters,
  today: string,
): SQL | undefined {
  let payerCondition: SQL | undefined = undefined;
  if (filters.payerIds.length > 0) {
    payerCondition = inArray(denials.payerId, filters.payerIds);
  }
  return and(
    eq(denials.organizationId, organizationId),
    statusCondition(filters),
    codeCondition(filters),
    payerCondition,
    dueCondition(filters, today),
    searchCondition(filters),
  );
}

// Rank order from F3: priority bucket (its enum order is the urgency order), then rank key.
const RANK_ORDER = [asc(denials.priorityBucket), asc(denials.rankKey), asc(denials.id)];

export async function listQueuePage(
  database: Database,
  organizationId: string,
  filters: QueueFilters,
  today: string,
): Promise<{ rows: QueueDenialRow[]; matchingCount: number }> {
  const conditions = queueConditions(organizationId, filters, today);
  const offset = (filters.page - 1) * QUEUE_PAGE_SIZE;
  const rawRows = await database
    .select({
      id: denials.id,
      patientControlNumber: denials.patientControlNumber,
      payerName: payers.name,
      groupCode: denials.groupCode,
      carcCode: denials.carcCode,
      amountAtStakeCents: denials.amountAtStakeCents,
      serviceDate: denials.serviceDate,
      appealDeadline: denials.appealDeadline,
      deadlineIsEstimate: denials.deadlineIsEstimate,
      status: denials.status,
    })
    .from(denials)
    .innerJoin(payers, eq(payers.id, denials.payerId))
    .where(conditions)
    .orderBy(...RANK_ORDER)
    .limit(QUEUE_PAGE_SIZE)
    .offset(offset);

  const countRows = await database.select({ total: count() }).from(denials).where(conditions);
  const matchingCount = countRows[0]?.total ?? 0;
  return { rows: z.array(queueRowSchema).parse(rawRows), matchingCount };
}

// Every matching id in rank order, for the denial page's "Previous" and "Next".
export async function listQueueDenialIds(
  database: Database,
  organizationId: string,
  filters: QueueFilters,
  today: string,
): Promise<string[]> {
  const rows = await database
    .select({ id: denials.id })
    .from(denials)
    .where(queueConditions(organizationId, filters, today))
    .orderBy(...RANK_ORDER);
  const ids: string[] = [];
  for (const row of rows) {
    ids.push(row.id);
  }
  return ids;
}

const openSummarySchema = z.object({
  openCount: z.number().int(),
  atStakeCents: z.coerce.number().int(),
  dueSoonCount: z.coerce.number().int(),
});

export type OpenDenialSummary = z.infer<typeof openSummarySchema>;

export async function summarizeOpenDenials(
  database: Database,
  organizationId: string,
  today: string,
): Promise<OpenDenialSummary> {
  const dueSoonCutoff = addDays(today, DEADLINE_WARNING_DAYS);
  const rows = await database
    .select({
      openCount: count(),
      atStakeCents: sql`coalesce(${sum(denials.amountAtStakeCents)}, 0)`,
      dueSoonCount: sql`count(*) filter (where ${denials.appealDeadline} <= ${dueSoonCutoff})`,
    })
    .from(denials)
    .where(
      and(
        eq(denials.organizationId, organizationId),
        inArray(denials.status, [...OPEN_DENIAL_STATUSES]),
      ),
    );
  return openSummarySchema.parse(rows[0] ?? { openCount: 0, atStakeCents: 0, dueSoonCount: 0 });
}

export async function countAllDenials(database: Database, organizationId: string): Promise<number> {
  const rows = await database
    .select({ total: count() })
    .from(denials)
    .where(eq(denials.organizationId, organizationId));
  return rows[0]?.total ?? 0;
}

const codeCountSchema = z.object({ code: z.string(), total: z.number().int() });

export async function countOpenDenialsByCode(
  database: Database,
  organizationId: string,
): Promise<z.infer<typeof codeCountSchema>[]> {
  const rows = await database
    .select({ code: denialCodeSql, total: count() })
    .from(denials)
    .where(
      and(
        eq(denials.organizationId, organizationId),
        inArray(denials.status, [...OPEN_DENIAL_STATUSES]),
      ),
    )
    .groupBy(denialCodeSql);
  return z.array(codeCountSchema).parse(rows);
}

const payerCountSchema = z.object({
  payerId: z.string().uuid(),
  name: z.string(),
  total: z.number().int(),
});

export async function countOpenDenialsByPayer(
  database: Database,
  organizationId: string,
): Promise<z.infer<typeof payerCountSchema>[]> {
  const rows = await database
    .select({ payerId: payers.id, name: payers.name, total: count() })
    .from(denials)
    .innerJoin(payers, eq(payers.id, denials.payerId))
    .where(
      and(
        eq(denials.organizationId, organizationId),
        inArray(denials.status, [...OPEN_DENIAL_STATUSES]),
      ),
    )
    .groupBy(payers.id, payers.name)
    .orderBy(asc(payers.name));
  return z.array(payerCountSchema).parse(rows);
}
