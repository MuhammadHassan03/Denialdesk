// Keep in step with the denial_status enum in server/db/schema.ts.
export type DenialStatus =
  | "needs_check"
  | "new"
  | "drafting"
  | "in_review"
  | "approved"
  | "submitted"
  | "paid"
  | "denied_again"
  | "written_off"
  | "manual";

export const DENIAL_STATUSES: readonly DenialStatus[] = [
  "needs_check",
  "new",
  "drafting",
  "in_review",
  "approved",
  "submitted",
  "paid",
  "denied_again",
  "written_off",
  "manual",
];

export const OPEN_DENIAL_STATUSES: readonly DenialStatus[] = [
  "needs_check",
  "new",
  "drafting",
  "in_review",
  "approved",
  "manual",
];

const STATUS_LABELS: Record<DenialStatus, string> = {
  needs_check: "Check fields",
  new: "New",
  drafting: "Drafting...",
  in_review: "In review",
  approved: "Approved",
  submitted: "Submitted",
  paid: "Paid",
  denied_again: "Denied again",
  written_off: "Written off",
  manual: "Manual",
};

export function denialStatusLabel(status: DenialStatus): string {
  return STATUS_LABELS[status];
}

export function isOpenStatus(status: DenialStatus): boolean {
  return OPEN_DENIAL_STATUSES.includes(status);
}
