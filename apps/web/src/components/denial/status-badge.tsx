import { denialStatusLabel, type DenialStatus } from "@/lib/denial-status";

const STATUS_CLASSES: Record<DenialStatus, string> = {
  needs_check: "bg-warn-soft text-warn-dark",
  new: "bg-line-soft text-subtle",
  drafting: "bg-brand-tint text-brand-dark",
  in_review: "bg-brand-soft text-brand-dark",
  approved: "bg-good-soft text-good",
  submitted: "bg-brand-soft text-brand-dark",
  paid: "bg-good-soft text-good",
  denied_again: "bg-bad-soft text-bad",
  written_off: "bg-line-soft text-subtle",
  manual: "border border-dashed border-faint text-subtle",
};

type StatusBadgeProps = {
  status: DenialStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[13px] font-semibold whitespace-nowrap ${STATUS_CLASSES[status]}`}
    >
      {denialStatusLabel(status)}
    </span>
  );
}
