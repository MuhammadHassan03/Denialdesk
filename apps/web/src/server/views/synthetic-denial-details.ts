import "server-only";

// PREVIEW DATA. The parts of a denial page that come from features not built yet:
// facts (F6), drafts (F6, F8), rules checks (F7), payer policies and history (F13).
// Every name and number here is made up.

export type FactsQuestion = {
  name: string;
  legend: string;
  options: { value: string; label: string }[];
  selected: string | null;
};

export type FactsField = {
  id: string;
  label: string;
  value: string;
  isCode: boolean;
};

export type FactsView = {
  question: FactsQuestion;
  fields: FactsField[];
};

export type PolicyView = {
  policyId: string;
  topic: string;
  effectiveDate: string;
  quote: string;
  sourceUrl: string;
};

export type RuleResult = "pass" | "warn" | "fail";

export type RuleCheckView = {
  name: string;
  result: RuleResult;
  reason: string;
};

export type LetterSegment = { text: string; isPolicyQuote: boolean };

export type LetterBlock = {
  role: "subject" | "reference" | "body" | "note" | "signoff";
  segments: LetterSegment[];
};

export type DraftView = {
  kind: "appeal_letter" | "corrected_claim";
  version: number;
  author: "ai" | "biller";
  letter: LetterBlock[];
  checks: RuleCheckView[];
};

export type HistoryEntry = {
  timestamp: string;
  description: string;
};

export type SyntheticDenialDetail = {
  suggestedActionReason: string;
  facts: FactsView | null;
  policies: PolicyView[];
  draft: DraftView | null;
  history: HistoryEntry[];
  activeSeconds: number;
};

function plain(text: string): LetterSegment[] {
  return [{ text, isPolicyQuote: false }];
}

const NORTHWIND_AUTH_POLICY: PolicyView = {
  policyId: "NW-PA-2026-04",
  topic: "Prior authorization",
  effectiveDate: "2026-01-01",
  quote: "Services performed within the approved authorization period are eligible for payment.",
  sourceUrl: "https://example.com/policies/northwind/NW-PA-2026-04",
};

const MEDICARE_EPIDURAL_POLICY: PolicyView = {
  policyId: "LCD-L39242",
  topic: "Epidural steroid injections for pain management",
  effectiveDate: "2026-03-01",
  quote:
    "Epidural steroid injections are considered reasonable and necessary when radicular pain has persisted for at least four weeks despite conservative care.",
  sourceUrl: "https://example.com/policies/medicare/LCD-L39242",
};

const APPEAL_CHECKS_PASSED_WITH_DEADLINE_WARNING: RuleCheckView[] = [
  { name: "Schema valid", result: "pass", reason: "The letter has every structured part." },
  { name: "Claim references", result: "pass", reason: "Claim references match the denial." },
  { name: "Citations exist", result: "pass", reason: "The cited policy exists for this payer." },
  {
    name: "Quotes are real",
    result: "pass",
    reason: "The quote matches the policy word for word.",
  },
  {
    name: "Required parts",
    result: "pass",
    reason: "Subject, argument, request and attachments are present.",
  },
  { name: "No placeholders", result: "pass", reason: "No leftover placeholders." },
  { name: "Facts respected", result: "pass", reason: "The letter matches your facts." },
  { name: "Deadline", result: "warn", reason: "The deadline is in 3 days." },
];

const SYNTHETIC_DETAILS: Record<string, SyntheticDenialDetail> = {
  "den-20517": {
    suggestedActionReason:
      "You said the auth was issued before the visit, so this looks like a payer error. An appeal with the auth number is the right move.",
    facts: {
      question: {
        name: "authObtained",
        legend: "Was an authorization obtained before the service?",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "not_sure", label: "Not sure" },
        ],
        selected: "yes",
      },
      fields: [
        { id: "authNumber", label: "Authorization number", value: "AUTH-88213", isCode: true },
        { id: "authIssuedDate", label: "Date it was issued", value: "2026-08-30", isCode: false },
      ],
    },
    policies: [NORTHWIND_AUTH_POLICY],
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
            { text: `"${NORTHWIND_AUTH_POLICY.quote}"`, isPolicyQuote: true },
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
      checks: APPEAL_CHECKS_PASSED_WITH_DEADLINE_WARNING,
    },
    history: [
      { timestamp: "2026-11-04T15:12:00Z", description: "Rules check passed version 2" },
      { timestamp: "2026-11-04T15:11:00Z", description: "AI wrote version 2" },
      {
        timestamp: "2026-11-04T15:09:00Z",
        description: "Rules check found 1 problem in version 1",
      },
      { timestamp: "2026-11-04T15:08:00Z", description: "You saved the facts" },
      { timestamp: "2026-11-04T15:06:00Z", description: "You opened this denial" },
      { timestamp: "2026-11-03T21:12:00Z", description: "Created from 835 file remit_1102.835" },
    ],
    activeSeconds: 222,
  },
  "den-20402": {
    suggestedActionReason:
      "CO-50 means the payer thinks the service wasn't needed. Payers often reverse this when the appeal points to their own coverage policy and the chart notes.",
    facts: {
      question: {
        name: "chartNotes",
        legend: "Do you have chart notes supporting the need for the service?",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
        selected: "yes",
      },
      fields: [
        {
          id: "diagnosisCodes",
          label: "Supporting diagnosis codes",
          value: "M54.16",
          isCode: true,
        },
      ],
    },
    policies: [MEDICARE_EPIDURAL_POLICY],
    draft: {
      kind: "appeal_letter",
      version: 1,
      author: "ai",
      letter: [
        { role: "subject", segments: plain("Re: Request for redetermination, claim CLM-20402") },
        {
          role: "reference",
          segments: plain(
            "Beneficiary: [Patient name] · Date of service: August 28, 2026 · Claim number MB-26-4410287",
          ),
        },
        {
          role: "body",
          segments: plain(
            "We request redetermination of the CO-50 denial for CPT 64483. The chart notes document radicular pain for six weeks despite physical therapy and medication.",
          ),
        },
        {
          role: "body",
          segments: [
            { text: "The applicable coverage determination states: ", isPolicyQuote: false },
            { text: `"${MEDICARE_EPIDURAL_POLICY.quote}"`, isPolicyQuote: true },
            { text: " (LCD-L39242)", isPolicyQuote: false },
          ],
        },
        {
          role: "body",
          segments: plain("We ask that you reprocess the claim and pay the allowed amount."),
        },
        {
          role: "note",
          segments: plain("Attachments: chart notes for date of service 2026-08-28."),
        },
        { role: "signoff", segments: plain("Sincerely,\n[Biller name], [Practice name]") },
      ],
      checks: APPEAL_CHECKS_PASSED_WITH_DEADLINE_WARNING.slice(0, 7),
    },
    history: [
      { timestamp: "2026-11-03T19:40:00Z", description: "You approved draft version 1" },
      { timestamp: "2026-11-03T19:38:00Z", description: "Rules check passed version 1" },
      { timestamp: "2026-11-03T19:37:00Z", description: "AI wrote version 1" },
      { timestamp: "2026-11-03T19:35:00Z", description: "You opened this denial" },
      { timestamp: "2026-10-28T14:02:00Z", description: "Created from 835 file remit_1028.835" },
    ],
    activeSeconds: 271,
  },
  "den-20533": {
    suggestedActionReason:
      "The line is missing the modifier the payer expects. A corrected claim with the right modifier usually pays.",
    facts: {
      question: {
        name: "modifier",
        legend: "Which modifier should the line have?",
        options: [
          { value: "RT", label: "RT (right side)" },
          { value: "LT", label: "LT (left side)" },
          { value: "50", label: "50 (both sides)" },
        ],
        selected: null,
      },
      fields: [],
    },
    policies: [],
    draft: null,
    history: [
      { timestamp: "2026-11-03T21:12:00Z", description: "Created from 835 file remit_1102.835" },
    ],
    activeSeconds: 0,
  },
};

const CODE_REASONS: Record<string, string> = {
  "CO-50":
    "CO-50 means the payer thinks the service wasn't needed. Payers often reverse this when the appeal points to their own coverage policy and the chart notes.",
  "CO-16": "The remark codes name the missing information. Add it and send a corrected claim.",
  "CO-29": "There's no proof of timely filing, so an appeal is unlikely to succeed.",
  "CO-197": "Check whether an authorization was on file before the service.",
};

const MANUAL_REASON =
  "Denialdesk doesn't draft for this code yet. Work it in your usual way, then mark it as submitted or written off.";

export function findSyntheticDenialDetail(
  denialId: string,
  carcCode: string,
): SyntheticDenialDetail {
  const detail = SYNTHETIC_DETAILS[denialId];
  if (detail !== undefined) {
    return detail;
  }
  return {
    suggestedActionReason: CODE_REASONS[carcCode] ?? MANUAL_REASON,
    facts: null,
    policies: [],
    draft: null,
    history: [],
    activeSeconds: 0,
  };
}
