import "server-only";
import { factsQuestionFor } from "@/lib/facts-questions";
import type { DenialPageView, LetterSegment, PolicyView } from "./denial-view";

// DESIGN PREVIEW ONLY. One made-up denial that shows the draft, rules check and policy
// panels before drafting (F6), rules (F7) and policies exist. Every name and number is
// synthetic. The preview page refuses to render in production.

const PREVIEW_TODAY = "2026-11-04";

function plain(text: string): LetterSegment[] {
  return [{ text, isPolicyQuote: false }];
}

const PREVIEW_POLICY: PolicyView = {
  policyId: "NW-PA-2026-04",
  topic: "Prior authorization",
  effectiveDate: "2026-01-01",
  quote: "Services performed within the approved authorization period are eligible for payment.",
  sourceUrl: "https://example.com/policies/northwind/NW-PA-2026-04",
};

export function buildPreviewDenialPage(): DenialPageView {
  return {
    id: "preview",
    today: PREVIEW_TODAY,
    isPreview: true,
    code: "CO-197",
    headline: "CO-197: authorization missing",
    status: "in_review",
    isClosed: false,
    claimNumber: "CLM-20517",
    payerClaimControlNumber: "7716204918",
    payerName: "Northwind Health",
    serviceDate: "2026-09-09",
    amountAtStakeCents: 231000,
    appealDeadline: "2026-11-07",
    deadlineIsEstimate: false,
    sourceFilename: "remit_1102.835",
    reasons: [
      {
        label: "CO-197",
        meaning:
          "Precertification or authorization was absent. The payer has no record of an approval for this service.",
      },
      {
        label: "Remark M62",
        meaning: "The treatment authorization code is missing, incomplete or invalid on the claim.",
      },
    ],
    serviceLine: {
      lineLabel: "Line 1",
      procedureCode: "72148",
      modifiers: [],
      billedCents: 231000,
      paidCents: 0,
    },
    suggestedAction: "appeal",
    suggestedActionReason:
      "You said the auth was issued before the visit, so this looks like a payer error. An appeal with the auth number is the right move.",
    factsQuestion: factsQuestionFor("CO-197"),
    factsAnswers: {
      choice: "yes",
      fieldValues: { authNumber: "AUTH-88213", authIssuedDate: "2026-08-30" },
    },
    policies: [PREVIEW_POLICY],
    draft: {
      kind: "appeal_letter",
      version: 2,
      author: "ai",
      letter: [
        { role: "subject", segments: plain("Re: Request for reconsideration, claim CLM-20517") },
        {
          role: "reference",
          segments: plain(
            "Member: [Patient name] · Date of service: September 9, 2026 · Payer claim number 7716204918",
          ),
        },
        {
          role: "body",
          segments: plain(
            "We are appealing the denial of this claim under reason code CO-197. Northwind Health issued authorization AUTH-88213 on August 30, 2026, ten days before the service, for CPT 72148.",
          ),
        },
        {
          role: "body",
          segments: [
            {
              text: "Northwind Health's prior authorization policy states: ",
              isPolicyQuote: false,
            },
            { text: `"${PREVIEW_POLICY.quote}"`, isPolicyQuote: true },
            { text: " (policy NW-PA-2026-04)", isPolicyQuote: false },
          ],
        },
        {
          role: "body",
          segments: plain("We ask that you reprocess the claim and pay the allowed amount."),
        },
        {
          role: "note",
          segments: plain(
            "Attachments: authorization confirmation AUTH-88213; MRI order dated August 29, 2026.",
          ),
        },
        { role: "signoff", segments: plain("Sincerely,\n[Biller name], [Practice name]") },
      ],
      checks: [
        { name: "Schema valid", result: "pass", reason: "The letter has every structured part" },
        { name: "Claim references", result: "pass", reason: "claim references match" },
        { name: "Citations exist", result: "pass", reason: "cited policy exists" },
        {
          name: "Quotes are real",
          result: "pass",
          reason: "quote matches the policy word for word",
        },
        { name: "Required parts", result: "pass", reason: "required parts present" },
        { name: "No placeholders", result: "pass", reason: "no leftover placeholders" },
        { name: "Facts respected", result: "pass", reason: "matches your facts" },
        { name: "Deadline", result: "warn", reason: "deadline in 3 days" },
      ],
    },
    history: [
      { id: "h6", timestampLabel: "Nov 4, 10:12 AM", description: "Rules check passed version 2" },
      { id: "h5", timestampLabel: "Nov 4, 10:11 AM", description: "AI wrote version 2" },
      {
        id: "h4",
        timestampLabel: "Nov 4, 10:09 AM",
        description: "Rules check found 1 problem in version 1",
      },
      { id: "h3", timestampLabel: "Nov 4, 10:08 AM", description: "You saved the facts" },
      { id: "h2", timestampLabel: "Nov 4, 10:06 AM", description: "You opened this denial" },
      { id: "h1", timestampLabel: "Nov 3, 4:12 PM", description: "Created from remit_1102.835" },
    ],
    activeSeconds: 222,
    navigation: { backHref: "/queue", previousHref: null, nextHref: null },
    otherDenialsOnClaim: [],
  };
}
