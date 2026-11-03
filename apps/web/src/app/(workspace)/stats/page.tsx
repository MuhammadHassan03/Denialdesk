import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { ClockIcon } from "@/components/ui/icons";
import { StatTile } from "@/components/ui/stat-tile";
import { formatCents } from "@/lib/money";
import { requireSession } from "@/server/auth/session";
import { loadStatsView, type OutcomeLine, type StatsPeriod } from "@/server/views/stats-view";

export const metadata: Metadata = {
  title: "Your stats · Denialdesk",
};

type StatsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const periodSchema = z.enum(["today", "week", "all"]).catch("today");

const PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "all", label: "All time" },
];

const CARD = "flex min-w-0 flex-col rounded-[20px] border border-line bg-white px-7 py-6";
const OUTCOME_TONE_CLASSES: Record<OutcomeLine["tone"], string> = {
  good: "text-good",
  neutral: "",
  bad: "text-bad",
};
const MAX_BAR_HEIGHT_PX = 178;

export default async function StatsPage({ searchParams }: StatsPageProps) {
  const biller = await requireSession();
  const rawPeriod = (await searchParams).period;
  const period = periodSchema.parse(typeof rawPeriod === "string" ? rawPeriod : undefined);
  const stats = await loadStatsView(biller, period);
  const totals = stats.totals;

  let busiestDay = 1;
  for (const day of stats.week) {
    busiestDay = Math.max(busiestDay, day.decidedCount ?? 0);
  }
  let mostRejections = 1;
  for (const reason of stats.rejectionReasons) {
    mostRejections = Math.max(mostRejections, reason.count);
  }
  const weekDescription = stats.week
    .map((day) => `${day.dayLabel} ${day.decidedCount ?? "not yet"}`)
    .join(", ");

  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-7 px-4 py-8 sm:px-8">
      <div className="flex animate-rise flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[32px] font-bold tracking-[-0.02em]">Your stats</h1>
          <p className="m-0 text-[15px] text-muted">
            Active working time only. The timer pauses when you step away.
          </p>
        </div>
        <nav aria-label="Period" className="flex gap-1 rounded-xl border border-line bg-white p-1">
          {PERIODS.map((choice) => {
            const isCurrent = choice.value === period;
            return (
              <Link
                key={choice.value}
                href={`/stats?period=${choice.value}`}
                aria-current={isCurrent ? "page" : undefined}
                className={`inline-flex min-h-10 items-center rounded-[9px] px-3.5 text-sm font-semibold no-underline transition-colors ${isCurrent ? "bg-brand text-white hover:text-white" : "text-subtle hover:bg-well hover:text-ink"}`}
              >
                {choice.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {totals.decidedCount === 0 ? (
        <p className="m-0 animate-rise rounded-[14px] bg-white px-5 py-4 text-[15px] text-muted">
          Your stats will show up after your first decision.
        </p>
      ) : null}

      <section
        aria-label="Totals"
        className="grid animate-rise grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6 [animation-delay:80ms]"
      >
        <StatTile label="Denials decided" value={String(totals.decidedCount)} tone="slate" />
        <StatTile
          label="Minutes per denial"
          value="–"
          tone="brand"
          note="Shows once the timer is running"
        />
        <StatTile
          label="Approved for appeal or resubmission"
          value={formatCents(totals.approvedCents)}
          tone="good"
        />
        <StatTile
          label="Recovered from payers"
          value={formatCents(stats.recoveredCents)}
          tone="good"
          note="Matched from later 835s"
        />
        <StatTile
          label="Written off"
          value={formatCents(totals.writtenOffCents)}
          tone="slate"
          note={totals.writtenOffCount === 1 ? "1 denial" : `${totals.writtenOffCount} denials`}
        />
      </section>

      <div className="flex animate-rise flex-wrap items-stretch gap-6 [animation-delay:160ms]">
        <section aria-labelledby="baseline-heading" className={`${CARD} flex-[1_1_420px] gap-3.5`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="baseline-heading" className="m-0 text-lg font-semibold">
              Baseline mode
            </h2>
            <span className="rounded-full bg-line-soft px-2.5 py-1 text-[13px] font-semibold text-subtle">
              Off
            </span>
          </div>
          <p className="m-0 text-sm leading-[1.55] text-muted">
            Work a set of denials your usual way, with no AI draft, while the timer runs. That gives
            a fair number to compare against.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="baseline-count" className="text-sm font-medium">
                Number of denials
              </label>
              <input
                id="baseline-count"
                type="number"
                min={20}
                defaultValue={20}
                disabled
                className="min-h-11 w-[120px] rounded-xl border border-line-strong px-3.5 font-mono text-[15px] text-ink disabled:bg-well"
              />
            </div>
            <button
              type="button"
              disabled
              className="min-h-11 rounded-xl border border-brand bg-white px-4 text-sm font-semibold text-brand disabled:cursor-not-allowed disabled:opacity-50"
            >
              Turn on baseline mode
            </button>
          </div>
          <p className="m-0 text-[13px] text-muted">Baseline mode arrives with the timer.</p>
        </section>

        <section aria-labelledby="outcomes-heading" className={`${CARD} flex-[1_1_420px] gap-3.5`}>
          <h2 id="outcomes-heading" className="m-0 text-lg font-semibold">
            What happened after you sent them
          </h2>
          <ul className="m-0 flex list-none flex-col gap-3 p-0 text-sm">
            {stats.outcomes.map((outcome) => (
              <li key={outcome.label} className="flex justify-between gap-3">
                <span>{outcome.label}</span>
                <span className={`font-mono font-semibold ${OUTCOME_TONE_CLASSES[outcome.tone]}`}>
                  {outcome.count} · {formatCents(outcome.amountCents)}
                </span>
              </li>
            ))}
            <li className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-warn-dark">
                <ClockIcon size={16} />
                No response in 45 days
              </span>
              {stats.noResponseCount === 0 ? (
                <span className="font-mono font-semibold">0</span>
              ) : (
                <Link href="/queue?status=submitted" className="font-semibold">
                  {stats.noResponseCount} to follow up
                </Link>
              )}
            </li>
          </ul>
        </section>
      </div>

      <div className="flex animate-rise flex-wrap items-stretch gap-6 [animation-delay:240ms]">
        <section
          aria-labelledby="compare-heading"
          className={`${CARD} flex-[999_1_560px] gap-5 shadow-[0_1px_2px_rgba(14,23,38,0.05),0_24px_48px_-24px_rgba(14,23,38,0.16)]`}
        >
          <h2 id="compare-heading" className="m-0 text-lg font-semibold">
            With Denialdesk vs your usual way
          </h2>
          <p className="m-0 rounded-[14px] bg-well px-4 py-3.5 text-sm text-muted">
            Not enough data yet. Each mode needs at least 20 timed denials before it shows.
          </p>
          <p className="m-0 text-[13px] text-muted">
            Minutes of active work per denial, from first open to decision.
          </p>
        </section>

        <section aria-labelledby="reasons-heading" className={`${CARD} flex-[1_1_360px] gap-3.5`}>
          <h2 id="reasons-heading" className="m-0 text-lg font-semibold">
            Why you rejected drafts
          </h2>
          {stats.rejectionReasons.length === 0 ? (
            <p className="m-0 text-sm text-muted">You haven&rsquo;t rejected a draft yet.</p>
          ) : null}
          {stats.rejectionReasons.map((reason) => (
            <div key={reason.label} className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <span>{reason.label}</span>
                <span className="font-mono">{reason.count}</span>
              </div>
              <div className="h-2.5 rounded-full bg-line-soft">
                <div
                  className="h-full rounded-full bg-brand-mid"
                  style={{ width: `${(reason.count / mostRejections) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </section>
      </div>

      <section
        aria-labelledby="week-heading"
        className={`${CARD} animate-rise gap-[18px] [animation-delay:320ms]`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="week-heading" className="m-0 text-lg font-semibold">
            Denials decided this week
          </h2>
          <span className="text-sm text-muted">
            Recovered so far{" "}
            <span className="font-mono font-semibold text-good">
              {formatCents(stats.recoveredCents)}
            </span>
          </span>
        </div>
        <div
          role="img"
          aria-label={`Denials decided per day: ${weekDescription}`}
          className="grid h-[200px] grid-cols-5 items-end gap-5 border-b border-line pt-2"
        >
          {stats.week.map((day) => (
            <div
              key={day.dayLabel}
              className="flex h-full flex-col items-center justify-end gap-1.5"
            >
              {day.decidedCount === null ? null : (
                <>
                  <span className={`font-mono text-[13px] ${day.isToday ? "font-semibold" : ""}`}>
                    {day.decidedCount}
                  </span>
                  <div
                    className={`w-[56%] origin-bottom animate-rise rounded-t-[10px] ${day.isToday ? "bg-brand shadow-[0_10px_20px_-10px_rgba(11,110,102,0.6)]" : "bg-brand-light"}`}
                    style={{
                      height: `${Math.max(4, (day.decidedCount / busiestDay) * MAX_BAR_HEIGHT_PX)}px`,
                    }}
                  />
                </>
              )}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-5 text-center text-[13px] text-muted">
          {stats.week.map((day) => (
            <span key={day.dayLabel} className={day.isToday ? "font-semibold text-ink" : ""}>
              {day.isToday ? `${day.dayLabel} (today)` : day.dayLabel}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
