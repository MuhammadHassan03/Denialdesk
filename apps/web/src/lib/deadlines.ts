import { daysUntil, isDeadlineSoon } from "./dates";

// How urgent a deadline is, in words the badge shows. Colour is never the only signal.

export type DeadlineUrgency = "overdue" | "soon" | "later";

export type DeadlineDescription = {
  urgency: DeadlineUrgency;
  label: string;
  daysLeft: number;
};

const ESTIMATE_SUFFIX = " (est.)";

function pluralDays(dayCount: number): string {
  if (dayCount === 1) {
    return "1 day";
  }
  return `${dayCount} days`;
}

export function describeDeadline(
  appealDeadline: string,
  today: string,
  deadlineIsEstimate: boolean,
): DeadlineDescription {
  const daysLeft = daysUntil(appealDeadline, today);
  const suffix = deadlineIsEstimate ? ESTIMATE_SUFFIX : "";

  if (daysLeft < 0) {
    const daysOverdue = -daysLeft;
    return { urgency: "overdue", label: `Overdue ${pluralDays(daysOverdue)}${suffix}`, daysLeft };
  }

  let label = `Due in ${pluralDays(daysLeft)}`;
  if (daysLeft === 0) {
    label = "Due today";
  }

  if (isDeadlineSoon(appealDeadline, today)) {
    return { urgency: "soon", label: `${label}${suffix}`, daysLeft };
  }
  return { urgency: "later", label: `${label}${suffix}`, daysLeft };
}
