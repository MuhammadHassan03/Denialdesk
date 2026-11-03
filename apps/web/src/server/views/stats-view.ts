import "server-only";
import { addDays, daysUntil, todayInTimezone } from "@/lib/dates";
import type { SignedInBiller } from "../auth/session";
import { db } from "../db/client";
import {
  countDecisionsPerDay,
  countRejectionReasons,
  countSubmittedWithoutResponse,
  sumDecisions,
  sumOutcomes,
  type DecisionTotals,
} from "../db/queries/denial-stats";

export type StatsPeriod = "today" | "week" | "all";

export type WeekdayBar = {
  dayLabel: string;
  decidedCount: number | null;
  isToday: boolean;
};

export type OutcomeLine = {
  label: string;
  count: number;
  amountCents: number;
  tone: "good" | "neutral" | "bad";
};

export type RejectionReasonLine = {
  label: string;
  count: number;
};

export type StatsView = {
  period: StatsPeriod;
  totals: DecisionTotals;
  outcomes: OutcomeLine[];
  recoveredCents: number;
  noResponseCount: number;
  rejectionReasons: RejectionReasonLine[];
  week: WeekdayBar[];
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const MONDAY_INDEX = 1;
const DAYS_PER_WEEK = 7;

const REJECTION_REASON_LABELS: Record<string, string> = {
  wrong_facts: "Wrong facts",
  policy_wrong_or_missing: "Policy wrong or missing",
  poor_writing: "Poor writing",
  wrong_action: "Wrong action",
  other: "Other",
};

function mondayOf(today: string): string {
  const weekdayIndex = new Date(`${today}T00:00:00Z`).getUTCDay();
  const daysSinceMonday = (weekdayIndex - MONDAY_INDEX + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  return addDays(today, -daysSinceMonday);
}

function periodStart(period: StatsPeriod, today: string): string | null {
  if (period === "today") {
    return today;
  }
  if (period === "week") {
    return mondayOf(today);
  }
  return null;
}

async function loadWeek(biller: SignedInBiller, today: string): Promise<WeekdayBar[]> {
  const monday = mondayOf(today);
  const dailyCounts = await countDecisionsPerDay(db, biller.user.id, biller.user.timezone, monday);
  const week: WeekdayBar[] = [];
  for (let dayIndex = 0; dayIndex < WEEKDAY_LABELS.length; dayIndex += 1) {
    const day = addDays(monday, dayIndex);
    let decidedCount: number | null = 0;
    for (const dailyCount of dailyCounts) {
      if (dailyCount.day === day) {
        decidedCount = dailyCount.total;
      }
    }
    // Days still ahead have no bar yet.
    if (daysUntil(day, today) > 0) {
      decidedCount = null;
    }
    week.push({ dayLabel: WEEKDAY_LABELS[dayIndex] ?? "", decidedCount, isToday: day === today });
  }
  return week;
}

export async function loadStatsView(
  biller: SignedInBiller,
  period: StatsPeriod,
): Promise<StatsView> {
  const userId = biller.user.id;
  const timezone = biller.user.timezone;
  const today = todayInTimezone(new Date(), timezone);
  const totals = await sumDecisions(db, userId, timezone, periodStart(period, today));

  const outcomeRows = await sumOutcomes(db, biller.user.organizationId);
  const outcomes: OutcomeLine[] = [
    { label: "Paid", count: 0, amountCents: 0, tone: "good" },
    { label: "Waiting for the payer", count: 0, amountCents: 0, tone: "neutral" },
    { label: "Denied again, back in your queue", count: 0, amountCents: 0, tone: "bad" },
  ];
  let recoveredCents = 0;
  for (const outcomeRow of outcomeRows) {
    let line = outcomes[2];
    if (outcomeRow.status === "paid") {
      line = outcomes[0];
      recoveredCents = outcomeRow.amountCents;
    }
    if (outcomeRow.status === "submitted") {
      line = outcomes[1];
    }
    if (line !== undefined) {
      line.count = outcomeRow.total;
      line.amountCents = outcomeRow.amountCents;
    }
  }

  const reasonRows = await countRejectionReasons(db, userId);
  const rejectionReasons: RejectionReasonLine[] = [];
  for (const reasonRow of reasonRows) {
    rejectionReasons.push({
      label: REJECTION_REASON_LABELS[reasonRow.reason] ?? "Other",
      count: reasonRow.total,
    });
  }
  rejectionReasons.sort((first, second) => second.count - first.count);

  return {
    period,
    totals,
    outcomes,
    recoveredCents,
    noResponseCount: await countSubmittedWithoutResponse(
      db,
      biller.user.organizationId,
      new Date(),
    ),
    rejectionReasons,
    week: await loadWeek(biller, today),
  };
}
