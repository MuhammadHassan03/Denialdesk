import Link from "next/link";
import { CheckIcon, WarningIcon } from "@/components/ui/icons";
import type { UploadRowTone, UploadRowView } from "@/server/views/upload-view";
import { ProgressBar } from "./progress-bar";
import { RetryProcessingButton } from "./retry-processing-button";
import { type UploadBadgeTone, UploadRowLayout } from "./upload-row-layout";

const STATUS_CLASSES: Record<UploadRowTone, string> = {
  working: "text-brand-dark",
  done: "text-good",
  attention: "text-warn-dark",
  failed: "text-bad",
};

function badgeTone(row: UploadRowView): UploadBadgeTone {
  if (row.tone === "failed") {
    return "failed";
  }
  if (row.sourceLabel === "PDF") {
    return "pdf";
  }
  return "remittance";
}

function RowDetail({ row }: { row: UploadRowView }) {
  if (row.isInProgress) {
    return (
      <>
        <ProgressBar label={`${row.statusText} ${row.fileName}`} />
        <span className="text-[13px] text-muted">{row.detailText}</span>
      </>
    );
  }
  const textClass = row.detailIsError ? "text-bad" : "text-muted";
  return <span className={`text-[13px] leading-normal ${textClass}`}>{row.detailText}</span>;
}

function RowTrailing({ row }: { row: UploadRowView }) {
  const statusClass = STATUS_CLASSES[row.tone];
  return (
    <>
      <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${statusClass}`}>
        {row.tone === "done" ? <CheckIcon size={16} /> : null}
        {row.tone === "attention" || row.tone === "failed" ? <WarningIcon size={16} /> : null}
        {row.statusText}
      </span>
      {row.errorId === null ? null : (
        <span className="font-mono text-xs text-muted">Error ID {row.errorId}</span>
      )}
      {row.canRetry ? <RetryProcessingButton remittanceId={row.id} /> : null}
      {row.showQueueLink ? (
        <Link
          href="/queue"
          className="inline-flex min-h-10 items-center rounded-[10px] border border-brand px-3.5 text-sm font-semibold text-brand no-underline hover:bg-brand-tint"
        >
          Open in queue
        </Link>
      ) : null}
    </>
  );
}

type RecentUploadsProps = {
  rows: UploadRowView[];
};

export function RecentUploads({ rows }: RecentUploadsProps) {
  return (
    <section
      aria-labelledby="recent-uploads-heading"
      className="overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_1px_2px_rgba(14,23,38,0.05),0_24px_48px_-24px_rgba(14,23,38,0.16)]"
    >
      <h2
        id="recent-uploads-heading"
        className="m-0 border-b border-line-soft px-6 py-[18px] text-lg font-semibold"
      >
        Recent uploads
      </h2>
      {rows.length === 0 ? (
        <p className="m-0 px-6 py-8 text-[15px] text-muted">
          Nothing uploaded yet. Files you upload show here with what we found in them.
        </p>
      ) : (
        <ul aria-live="polite" className="m-0 list-none p-0">
          {rows.map((row) => (
            <UploadRowLayout
              key={row.id}
              id={`upload-${row.id}`}
              badgeLabel={row.sourceLabel}
              badgeTone={badgeTone(row)}
              fileName={row.fileName}
              detail={<RowDetail row={row} />}
              trailing={<RowTrailing row={row} />}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
