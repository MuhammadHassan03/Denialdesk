import type { DenialStatus } from "./denial-status";

export type SuggestedAction = "appeal" | "fix" | "write_off" | "review_manually";

const ACTION_LABELS: Record<SuggestedAction, string> = {
  appeal: "Appeal",
  fix: "Fix and resubmit",
  write_off: "Write off",
  review_manually: "Review manually",
};

export function suggestedActionLabel(action: SuggestedAction): string {
  return ACTION_LABELS[action];
}

// The queue's "Next step" button: what the biller does next, given where the denial is.
export function nextStepLabel(status: DenialStatus, action: SuggestedAction): string {
  if (status === "needs_check") {
    return "Confirm details";
  }
  if (status === "manual" || action === "review_manually") {
    return "Review manually";
  }
  if (status === "drafting") {
    return "View";
  }
  if (status === "in_review") {
    return "Review draft";
  }
  if (status === "approved") {
    return "Export";
  }
  if (action === "appeal") {
    return "Appeal";
  }
  if (action === "fix") {
    return "Fix claim";
  }
  return "Write off?";
}
