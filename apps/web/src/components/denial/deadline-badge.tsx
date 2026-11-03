import { ClockIcon, WarningIcon } from "@/components/ui/icons";
import { describeDeadline, type DeadlineUrgency } from "@/lib/deadlines";

const URGENCY_CLASSES: Record<DeadlineUrgency, string> = {
  overdue: "bg-bad-soft text-bad",
  soon: "bg-warn-soft text-warn",
  later: "bg-line-soft text-subtle",
};

type DeadlineBadgeProps = {
  appealDeadline: string;
  today: string;
  deadlineIsEstimate: boolean;
  // Shown before the words, e.g. "Nov 7, due in 3 days" on the denial page.
  prefix?: string;
  large?: boolean;
};

// Words and an icon, never colour alone (F4).
export function DeadlineBadge({
  appealDeadline,
  today,
  deadlineIsEstimate,
  prefix,
  large = false,
}: DeadlineBadgeProps) {
  const deadline = describeDeadline(appealDeadline, today, deadlineIsEstimate);
  let label = deadline.label;
  if (prefix !== undefined) {
    label = `${prefix}, ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
  }
  const sizeClasses = large ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-[13px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${sizeClasses} ${URGENCY_CLASSES[deadline.urgency]}`}
    >
      {deadline.urgency === "overdue" ? <WarningIcon size={14} /> : null}
      {deadline.urgency === "soon" ? <ClockIcon size={14} /> : null}
      {label}
    </span>
  );
}
