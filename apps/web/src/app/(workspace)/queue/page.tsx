import type { Metadata } from "next";
import Link from "next/link";
import { QueueFilterBar } from "@/components/denial/queue-filters";
import { QueueShortcuts } from "@/components/denial/queue-shortcuts";
import { QueueTable } from "@/components/denial/queue-table";
import { UploadIcon } from "@/components/ui/icons";
import { StatTile } from "@/components/ui/stat-tile";
import { formatCents } from "@/lib/money";
import {
  hasActiveFilters,
  parseQueueFilters,
  queueFiltersToQueryString,
  type QueueFilters,
  type QueueSearchParams,
} from "@/lib/queue-filters";
import { requireSession } from "@/server/auth/session";
import { loadQueueView } from "@/server/views/queue-view";

export const metadata: Metadata = {
  title: "Your queue · Denialdesk",
};

type QueuePageProps = {
  searchParams: Promise<QueueSearchParams>;
};

const PRIMARY_BUTTON =
  "inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-[18px] text-[15px] font-semibold text-white no-underline shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_6px_16px_-6px_rgba(11,110,102,0.55)] transition hover:-translate-y-0.5 hover:bg-brand-dark hover:text-white";

const KEY_CLASSES = "rounded-md border border-line-strong bg-well px-1.5 py-0.5 font-mono";

function pageHref(filters: QueueFilters, page: number): string {
  const query = queueFiltersToQueryString({ ...filters, page });
  if (query === "") {
    return "/queue";
  }
  return `/queue?${query}`;
}

type EmptyStateProps = {
  title: string;
  linkLabel: string;
  linkHref: string;
};

function EmptyState({ title, linkLabel, linkHref }: EmptyStateProps) {
  return (
    <div className="flex animate-rise flex-col items-center gap-4 px-6 py-16 text-center">
      <p className="m-0 max-w-md text-[17px] font-semibold">{title}</p>
      <Link href={linkHref} className={PRIMARY_BUTTON}>
        {linkLabel}
      </Link>
    </div>
  );
}

export default async function QueuePage({ searchParams }: QueuePageProps) {
  const biller = await requireSession();
  const filters = parseQueueFilters(await searchParams);
  const queue = await loadQueueView(biller, filters);
  const queueQuery = queueFiltersToQueryString({ ...filters, page: 1 });

  const firstShown = queue.firstRank;
  const lastShown = queue.firstRank + queue.rows.length - 1;
  const hasPrevious = filters.page > 1;
  const hasNext = filters.page < queue.pageCount;

  let emptyState: EmptyStateProps | null = null;
  if (!queue.hasAnyDenials) {
    emptyState = {
      title: "No denials yet. Upload an 835 or EOB to start.",
      linkLabel: "Upload files",
      linkHref: "/upload",
    };
  } else if (queue.rows.length === 0 && hasActiveFilters(filters)) {
    emptyState = {
      title: "No denials match these filters.",
      linkLabel: "Clear filters",
      linkHref: "/queue",
    };
  } else if (queue.rows.length === 0) {
    emptyState = {
      title: "You're all caught up. Every denial has been worked.",
      linkLabel: "Show closed denials",
      linkHref: "/queue?status=all",
    };
  }

  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-7 px-4 py-8 sm:px-8">
      <QueueShortcuts />
      <div className="flex animate-rise flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[32px] font-bold tracking-[-0.02em]">Your queue</h1>
          <p className="m-0 text-[15px] text-muted">
            Most money and closest deadline first. Open a denial to see its draft.
          </p>
        </div>
        <Link href="/upload" className={PRIMARY_BUTTON}>
          <UploadIcon />
          Upload files
        </Link>
      </div>

      <section
        aria-label="Summary"
        className="grid animate-rise grid-cols-1 gap-6 [animation-delay:80ms] sm:grid-cols-3"
      >
        <StatTile label="Open denials" value={String(queue.summary.openCount)} tone="slate" />
        <StatTile label="At stake" value={formatCents(queue.summary.atStakeCents)} tone="brand" />
        <StatTile
          label="Due within 7 days"
          value={String(queue.summary.dueSoonCount)}
          tone={queue.summary.dueSoonCount > 0 ? "warn" : "slate"}
        />
      </section>

      <div className="animate-rise [animation-delay:160ms]">
        <QueueFilterBar
          filters={filters}
          codeOptions={queue.codeOptions}
          payerOptions={queue.payerOptions}
          matchingCount={queue.matchingCount}
        />
      </div>

      <section
        aria-label="Denials"
        className="animate-rise overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_1px_2px_rgba(14,23,38,0.05),0_24px_48px_-24px_rgba(14,23,38,0.16)] [animation-delay:240ms]"
      >
        {emptyState === null ? (
          <QueueTable rows={queue.rows} today={queue.today} queueQuery={queueQuery} />
        ) : (
          <EmptyState {...emptyState} />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-4 py-3.5 text-[13px] text-muted">
          <span>
            {queue.rows.length === 0
              ? "Nothing to show"
              : `Showing ${firstShown} to ${lastShown} of ${queue.matchingCount}`}
          </span>
          <span aria-label="Keyboard shortcuts: j and k move between rows, Enter opens one, slash jumps to search">
            <kbd className={KEY_CLASSES}>j</kbd> <kbd className={KEY_CLASSES}>k</kbd> move{" "}
            <kbd className={KEY_CLASSES}>Enter</kbd> open <kbd className={KEY_CLASSES}>/</kbd>{" "}
            search
          </span>
          <nav aria-label="Pages" className="flex gap-2">
            <PageLink
              href={pageHref(filters, filters.page - 1)}
              label="Previous"
              enabled={hasPrevious}
            />
            <PageLink href={pageHref(filters, filters.page + 1)} label="Next" enabled={hasNext} />
          </nav>
        </div>
      </section>
    </main>
  );
}

function PageLink({ href, label, enabled }: { href: string; label: string; enabled: boolean }) {
  const base = "inline-flex min-h-10 items-center rounded-[10px] border px-3.5 font-semibold";
  if (!enabled) {
    return (
      <span aria-disabled="true" className={`${base} border-line bg-well text-faint`}>
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={`${base} border-line-strong bg-white text-subtle no-underline hover:bg-well hover:text-ink`}
    >
      {label}
    </Link>
  );
}
