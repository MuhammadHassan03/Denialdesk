import "server-only";
import { formatTimestamp, todayInTimezone } from "@/lib/dates";
import {
  denialCode,
  denialCodeShortMeaning,
  defaultSuggestedAction,
  suggestedActionReason,
} from "@/lib/denial-codes";
import { isOpenStatus, type DenialStatus } from "@/lib/denial-status";
import { factsQuestionFor, type FactsQuestion } from "@/lib/facts-questions";
import { describeHistoryEvent } from "@/lib/history-words";
import { queueFiltersToQueryString, type QueueFilters } from "@/lib/queue-filters";
import type { SuggestedAction } from "@/lib/suggested-action";
import type { SignedInBiller } from "../auth/session";
import { db } from "../db/client";
import { listQueueDenialIds } from "../db/queries/denial-queue";
import { listDenialHistory } from "../db/queries/denial-history";
import { findDenialDetail, listOtherDenialsOnClaim } from "../db/queries/denials";
import { logServerError, newErrorId } from "../errors";
import { fetchCodeMeaning } from "../pipeline";

const UNKNOWN_CODE_MEANING = "We don't have a description for this code yet.";

export type ReasonView = {
  label: string;
  meaning: string;
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

export type FactsAnswers = {
  choice: string | null;
  fieldValues: Record<string, string>;
};

export type HistoryItemView = {
  id: string;
  timestampLabel: string;
  description: string;
};

export type DenialPageView = {
  id: string;
  today: string;
  // True only on the design preview, which runs on synthetic data.
  isPreview: boolean;
  code: string;
  headline: string;
  status: DenialStatus;
  isClosed: boolean;
  claimNumber: string;
  payerClaimControlNumber: string;
  payerName: string;
  serviceDate: string | null;
  amountAtStakeCents: number;
  appealDeadline: string;
  deadlineIsEstimate: boolean;
  sourceFilename: string;
  reasons: ReasonView[];
  serviceLine: {
    lineLabel: string;
    procedureCode: string | null;
    modifiers: string[];
    billedCents: number;
    paidCents: number;
  };
  suggestedAction: SuggestedAction;
  suggestedActionReason: string;
  factsQuestion: FactsQuestion | null;
  factsAnswers: FactsAnswers;
  policies: PolicyView[];
  draft: DraftView | null;
  history: HistoryItemView[];
  activeSeconds: number | null;
  navigation: {
    backHref: string;
    previousHref: string | null;
    nextHref: string | null;
  };
  otherDenialsOnClaim: { href: string; code: string }[];
};

async function loadReasonMeaning(code: string, denialId: string): Promise<string> {
  try {
    const meaning = await fetchCodeMeaning(code);
    return meaning?.plainEnglish ?? UNKNOWN_CODE_MEANING;
  } catch (error) {
    // The page still works without the pipeline; the meaning just reads as unknown.
    logServerError("code_meaning_lookup_failed", newErrorId(), { denialId }, error);
    return UNKNOWN_CODE_MEANING;
  }
}

function denialHref(denialId: string, queryString: string): string {
  if (queryString === "") {
    return `/denials/${denialId}`;
  }
  return `/denials/${denialId}?${queryString}`;
}

export async function loadDenialPageView(
  biller: SignedInBiller,
  denialId: string,
  filters: QueueFilters,
): Promise<DenialPageView | null> {
  const organizationId = biller.user.organizationId;
  const timezone = biller.user.timezone;
  const today = todayInTimezone(new Date(), timezone);

  const denial = await findDenialDetail(db, organizationId, denialId);
  if (denial === null) {
    return null;
  }

  const code = denialCode(denial.groupCode, denial.carcCode);
  const reasons: ReasonView[] = [
    { label: code, meaning: await loadReasonMeaning(code, denial.id) },
  ];
  for (const rarcCode of denial.rarcCodes) {
    // There's no remark code table yet (pipeline GET /remarks is planned), so say so in words.
    reasons.push({ label: `Remark ${rarcCode}`, meaning: UNKNOWN_CODE_MEANING });
  }

  const historyRows = await listDenialHistory(db, organizationId, denial.id);
  const history: HistoryItemView[] = [];
  for (const historyRow of historyRows) {
    history.push({
      id: historyRow.id,
      timestampLabel: formatTimestamp(historyRow.createdAt, timezone),
      description: describeHistoryEvent({
        action: historyRow.action,
        actor: historyRow.actor,
        draftVersion: historyRow.draftVersion,
        sourceFilename: denial.sourceFilename,
      }),
    });
  }

  // Previous and Next follow the queue's current filters and order (F5). Paging doesn't apply here.
  const queueFilters: QueueFilters = { ...filters, page: 1 };
  const queueQuery = queueFiltersToQueryString(queueFilters);
  const queueIds = await listQueueDenialIds(db, organizationId, queueFilters, today);
  const position = queueIds.indexOf(denial.id);
  let previousHref: string | null = null;
  let nextHref: string | null = null;
  const previousId = position > 0 ? queueIds[position - 1] : undefined;
  const nextId = position >= 0 ? queueIds[position + 1] : undefined;
  if (previousId !== undefined) {
    previousHref = denialHref(previousId, queueQuery);
  }
  if (nextId !== undefined) {
    nextHref = denialHref(nextId, queueQuery);
  }

  const siblings = await listOtherDenialsOnClaim(db, organizationId, denial);
  const otherDenialsOnClaim: { href: string; code: string }[] = [];
  for (const sibling of siblings) {
    otherDenialsOnClaim.push({
      href: denialHref(sibling.id, queueQuery),
      code: denialCode(sibling.groupCode, sibling.carcCode),
    });
  }

  let lineLabel = "Whole claim";
  if (denial.serviceLineRef !== "claim") {
    lineLabel = `Line ${denial.serviceLineRef}`;
  }

  return {
    id: denial.id,
    today,
    isPreview: false,
    code,
    headline: `${code}: ${denialCodeShortMeaning(code)}`,
    status: denial.status,
    isClosed: !isOpenStatus(denial.status),
    claimNumber: denial.patientControlNumber,
    payerClaimControlNumber: denial.payerClaimControlNumber,
    payerName: denial.payerName,
    serviceDate: denial.serviceDate,
    amountAtStakeCents: denial.amountAtStakeCents,
    appealDeadline: denial.appealDeadline,
    deadlineIsEstimate: denial.deadlineIsEstimate,
    sourceFilename: denial.sourceFilename,
    reasons,
    serviceLine: {
      lineLabel,
      procedureCode: denial.procedureCode,
      modifiers: denial.procedureModifiers,
      billedCents: denial.lineChargeCents ?? denial.claimChargeCents,
      paidCents: denial.linePaidCents ?? denial.claimPaidCents,
    },
    suggestedAction: defaultSuggestedAction(code),
    suggestedActionReason: suggestedActionReason(code),
    factsQuestion: factsQuestionFor(code),
    factsAnswers: { choice: null, fieldValues: {} },
    // Payer policies, drafts and the timer arrive with F6, F7 and F12.
    policies: [],
    draft: null,
    history,
    activeSeconds: null,
    navigation: {
      backHref: queueQuery === "" ? "/queue" : `/queue?${queueQuery}`,
      previousHref,
      nextHref,
    },
    otherDenialsOnClaim,
  };
}
