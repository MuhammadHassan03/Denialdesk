import type { ReactNode } from "react";

export type UploadBadgeTone = "remittance" | "pdf" | "failed" | "neutral";

const BADGE_CLASSES: Record<UploadBadgeTone, string> = {
  remittance: "bg-brand-soft text-brand font-mono",
  pdf: "bg-warn-soft text-warn-dark",
  failed: "bg-bad-soft text-bad font-mono",
  neutral: "bg-line-soft text-subtle font-mono",
};

type UploadRowLayoutProps = {
  id?: string;
  badgeLabel: string;
  badgeTone: UploadBadgeTone;
  fileName: string;
  // The line under the file name: a time and counts, a progress bar, or an error.
  detail: ReactNode;
  // Status words and any action, on the right.
  trailing?: ReactNode;
};

// One row of the upload list. Shared by uploads still in the browser and stored uploads.
export function UploadRowLayout({
  id,
  badgeLabel,
  badgeTone,
  fileName,
  detail,
  trailing,
}: UploadRowLayoutProps) {
  return (
    <li
      id={id}
      className="flex scroll-mt-24 flex-wrap items-center gap-4 border-b border-line-soft px-6 py-4 last:border-b-0"
    >
      <span
        aria-hidden="true"
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-xs font-bold ${BADGE_CLASSES[badgeTone]}`}
      >
        {badgeLabel}
      </span>
      <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
        <span className="truncate text-[15px] font-semibold" title={fileName}>
          {fileName}
        </span>
        {detail}
      </div>
      {trailing}
    </li>
  );
}
