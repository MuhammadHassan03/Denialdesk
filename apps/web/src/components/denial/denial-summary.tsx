import Link from "next/link";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { formatIsoDate, formatMonthDay } from "@/lib/dates";
import type { DenialStatus } from "@/lib/denial-status";
import { formatCents } from "@/lib/money";
import { DeadlineBadge } from "./deadline-badge";
import { StatusBadge } from "./status-badge";

type DenialNavigationProps = {
  backHref: string;
  previousHref: string | null;
  nextHref: string | null;
};

const NAV_BUTTON =
  "inline-flex min-h-11 items-center rounded-[10px] border px-3.5 text-sm font-semibold";

export function DenialNavigation({ backHref, previousHref, nextHref }: DenialNavigationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link
        href={backHref}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold no-underline"
      >
        <ChevronLeftIcon size={16} />
        Back to queue
      </Link>
      <nav aria-label="Denials in this view" className="flex gap-2">
        {previousHref === null ? (
          <span aria-disabled="true" className={`${NAV_BUTTON} border-line bg-well text-faint`}>
            First denial in this view
          </span>
        ) : (
          <Link
            href={previousHref}
            className={`${NAV_BUTTON} border-line-strong bg-white text-subtle no-underline hover:bg-well hover:text-ink`}
          >
            Previous
          </Link>
        )}
        {nextHref === null ? (
          <span aria-disabled="true" className={`${NAV_BUTTON} border-line bg-well text-faint`}>
            Last denial in this view
          </span>
        ) : (
          <Link
            href={nextHref}
            className={`${NAV_BUTTON} border-line-strong bg-white text-subtle no-underline hover:bg-well hover:text-ink`}
          >
            Next denial
          </Link>
        )}
      </nav>
    </div>
  );
}

type ClaimSummaryProps = {
  headline: string;
  status: DenialStatus;
  payerName: string;
  claimNumber: string;
  payerClaimControlNumber: string;
  serviceDate: string | null;
  amountAtStakeCents: number;
  appealDeadline: string;
  deadlineIsEstimate: boolean;
  today: string;
};

export function ClaimSummary(props: ClaimSummaryProps) {
  return (
    <section
      aria-label="Claim summary"
      className="flex flex-wrap items-center justify-between gap-6 rounded-[20px] border border-line bg-white px-7 py-6 shadow-[0_1px_2px_rgba(14,23,38,0.05),0_20px_40px_-24px_rgba(14,23,38,0.18)]"
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="m-0 text-[28px] font-bold tracking-[-0.02em]">{props.headline}</h1>
          <StatusBadge status={props.status} />
        </div>
        <p className="m-0 text-[15px] text-muted">
          {props.payerName} · Claim <span className="font-mono">{props.claimNumber}</span> · Payer
          claim <span className="font-mono">{props.payerClaimControlNumber}</span>
          {props.serviceDate === null
            ? null
            : ` · Service date ${formatIsoDate(props.serviceDate)}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-7">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-muted">At stake</span>
          <span className="font-mono text-[26px] font-semibold">
            {formatCents(props.amountAtStakeCents)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-muted">Appeal deadline</span>
          <DeadlineBadge
            appealDeadline={props.appealDeadline}
            today={props.today}
            deadlineIsEstimate={props.deadlineIsEstimate}
            prefix={formatMonthDay(props.appealDeadline)}
            large
          />
        </div>
      </div>
    </section>
  );
}
