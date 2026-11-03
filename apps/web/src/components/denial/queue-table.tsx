import Link from "next/link";
import { formatIsoDate } from "@/lib/dates";
import type { DenialStatus } from "@/lib/denial-status";
import { formatCents } from "@/lib/money";
import { nextStepLabel, type SuggestedAction } from "@/lib/suggested-action";
import { DeadlineBadge } from "./deadline-badge";
import { StatusBadge } from "./status-badge";

export type QueueTableRow = {
  id: string;
  rank: number;
  claimNumber: string;
  payerName: string;
  code: string;
  codeShortMeaning: string;
  amountAtStakeCents: number;
  serviceDate: string | null;
  appealDeadline: string;
  deadlineIsEstimate: boolean;
  status: DenialStatus;
  suggestedAction: SuggestedAction;
};

type QueueTableProps = {
  rows: QueueTableRow[];
  today: string;
  // Carried into each denial link so its "Previous" and "Next" follow this view.
  queueQuery: string;
};

const HEADER_CELL = "px-4 py-3.5 text-[13px] font-semibold";
const CELL = "px-4 py-3.5";

function denialHref(denialId: string, queueQuery: string): string {
  if (queueQuery === "") {
    return `/denials/${denialId}`;
  }
  return `/denials/${denialId}?${queueQuery}`;
}

// The button style says how much the next step matters: review a draft is the main call.
function nextStepClasses(status: DenialStatus, action: SuggestedAction): string {
  const base =
    "inline-flex min-h-10 items-center rounded-[10px] px-3.5 font-semibold whitespace-nowrap no-underline transition";
  if (status === "in_review") {
    return `${base} bg-brand text-white hover:bg-brand-dark hover:text-white`;
  }
  const isQuietStep =
    status === "approved" ||
    status === "manual" ||
    action === "write_off" ||
    action === "review_manually";
  if (isQuietStep) {
    return `${base} border border-line-strong text-subtle hover:bg-well hover:text-ink`;
  }
  return `${base} border border-brand text-brand hover:bg-brand-soft`;
}

export function QueueTable({ rows, today, queueQuery }: QueueTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1120px] border-collapse text-sm">
        <caption className="sr-only">Denials ranked by dollars at stake and days left</caption>
        <thead>
          <tr className="bg-well text-left text-muted">
            <th scope="col" className={HEADER_CELL}>
              #
            </th>
            <th scope="col" className={HEADER_CELL}>
              Due
            </th>
            <th scope="col" className={`${HEADER_CELL} text-right`}>
              At stake
            </th>
            <th scope="col" className={HEADER_CELL}>
              Denial
            </th>
            <th scope="col" className={HEADER_CELL}>
              Payer
            </th>
            <th scope="col" className={HEADER_CELL}>
              Claim
            </th>
            <th scope="col" className={HEADER_CELL}>
              Service date
            </th>
            <th scope="col" className={HEADER_CELL}>
              Status
            </th>
            <th scope="col" className={HEADER_CELL}>
              Next step
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const href = denialHref(row.id, queueQuery);
            return (
              <tr
                key={row.id}
                data-queue-row=""
                data-href={href}
                tabIndex={0}
                aria-label={`Rank ${row.rank}: ${row.code} ${row.codeShortMeaning}, ${formatCents(row.amountAtStakeCents)}, ${row.payerName}`}
                className="cursor-pointer border-t border-line-soft transition-colors hover:bg-brand-tint focus-visible:bg-brand-tint focus-visible:shadow-[inset_3px_0_0_#0B6E66] focus-visible:outline-none"
              >
                <td className={`${CELL} font-mono text-muted`}>{row.rank}</td>
                <td className={CELL}>
                  <DeadlineBadge
                    appealDeadline={row.appealDeadline}
                    today={today}
                    deadlineIsEstimate={row.deadlineIsEstimate}
                  />
                </td>
                <td className={`${CELL} text-right font-mono font-semibold`}>
                  {formatCents(row.amountAtStakeCents)}
                </td>
                <td className={CELL}>
                  <span className="font-semibold">{row.code}</span>{" "}
                  <span className="text-muted">{row.codeShortMeaning}</span>
                </td>
                <td className={`${CELL} max-w-[200px]`}>
                  <span className="block truncate" title={row.payerName}>
                    {row.payerName}
                  </span>
                </td>
                <td className={`${CELL} font-mono`}>{row.claimNumber}</td>
                <td className={`${CELL} whitespace-nowrap text-muted`}>
                  {row.serviceDate === null ? "Not given" : formatIsoDate(row.serviceDate)}
                </td>
                <td className={CELL}>
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-2.5">
                  <Link
                    href={href}
                    tabIndex={-1}
                    className={nextStepClasses(row.status, row.suggestedAction)}
                  >
                    {nextStepLabel(row.status, row.suggestedAction)}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
