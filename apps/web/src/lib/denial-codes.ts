import type { SuggestedAction } from "./suggested-action";

// Labels for the codes Denialdesk drafts for (AGENTS.md). The full plain-English
// meanings come from the pipeline's code table; these are the short queue labels.

export const SUPPORTED_DENIAL_CODES: readonly string[] = [
  "CO-197",
  "CO-50",
  "CO-4",
  "CO-16",
  "CO-29",
];

type SupportedCodeCopy = {
  shortMeaning: string;
  defaultAction: SuggestedAction;
  actionReason: string;
};

const SUPPORTED_CODE_COPY: Record<string, SupportedCodeCopy> = {
  "CO-197": {
    shortMeaning: "No prior auth",
    defaultAction: "appeal",
    actionReason:
      "If an authorization was on file before the service, this is a payer error and an appeal with the auth number is the right move. Answer the question below to confirm.",
  },
  "CO-50": {
    shortMeaning: "Not medically necessary",
    defaultAction: "appeal",
    actionReason:
      "CO-50 means the payer thinks the service wasn't needed. Payers often reverse this when the appeal points to their own coverage policy and the chart notes.",
  },
  "CO-4": {
    shortMeaning: "Modifier mismatch",
    defaultAction: "fix",
    actionReason:
      "The line is missing the modifier the payer expects. A corrected claim with the right modifier usually pays.",
  },
  "CO-16": {
    shortMeaning: "Missing information",
    defaultAction: "fix",
    actionReason:
      "The remark codes name the missing information. Add it and send a corrected claim.",
  },
  "CO-29": {
    shortMeaning: "Filed after the deadline",
    defaultAction: "appeal",
    actionReason:
      "With proof the claim was filed on time, an appeal can win. Without proof, an appeal is unlikely to succeed and a write-off is the usual call.",
  },
};

const MANUAL_SHORT_MEANING = "Review manually";
const MANUAL_ACTION_REASON =
  "Denialdesk doesn't draft for this code yet. Work it in your usual way, then mark it as submitted or written off.";

export function denialCode(groupCode: string, carcCode: string): string {
  return `${groupCode}-${carcCode}`;
}

export function isSupportedDenialCode(code: string): boolean {
  return SUPPORTED_DENIAL_CODES.includes(code);
}

export function denialCodeShortMeaning(code: string): string {
  return SUPPORTED_CODE_COPY[code]?.shortMeaning ?? MANUAL_SHORT_MEANING;
}

// The action before the biller answers any facts question (F6 refines it).
export function defaultSuggestedAction(code: string): SuggestedAction {
  return SUPPORTED_CODE_COPY[code]?.defaultAction ?? "review_manually";
}

export function suggestedActionReason(code: string): string {
  return SUPPORTED_CODE_COPY[code]?.actionReason ?? MANUAL_ACTION_REASON;
}
