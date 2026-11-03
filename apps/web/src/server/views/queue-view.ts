import "server-only";
import { todayInTimezone } from "@/lib/dates";
import {
  defaultSuggestedAction,
  denialCode,
  denialCodeShortMeaning,
  SUPPORTED_DENIAL_CODES,
} from "@/lib/denial-codes";
import type { DenialStatus } from "@/lib/denial-status";
import { OTHER_CODES_FILTER, type QueueFilters } from "@/lib/queue-filters";
import type { SuggestedAction } from "@/lib/suggested-action";
import type { SignedInBiller } from "../auth/session";
import { db } from "../db/client";
import {
  countAllDenials,
  countOpenDenialsByCode,
  countOpenDenialsByPayer,
  listQueuePage,
  QUEUE_PAGE_SIZE,
  summarizeOpenDenials,
  type OpenDenialSummary,
} from "../db/queries/denial-queue";

export type QueueRow = {
  id: string;
  rank: number;
  claimNumber: string;
  payerName: string;
  code: string;
  codeShortMeaning: string;
  amountAtStakeCents: number;
  serviceDate: string | null;
  appealDeadline: string;
  deadlineIsEstimate: boolean;
  status: DenialStatus;
  suggestedAction: SuggestedAction;
};

export type FilterOption = {
  value: string;
  label: string;
  detail: string;
  count: number;
};

export type QueueView = {
  today: string;
  rows: QueueRow[];
  matchingCount: number;
  firstRank: number;
  pageCount: number;
  summary: OpenDenialSummary;
  codeOptions: FilterOption[];
  payerOptions: FilterOption[];
  hasAnyDenials: boolean;
};

async function loadCodeOptions(organizationId: string): Promise<FilterOption[]> {
  const codeCounts = await countOpenDenialsByCode(db, organizationId);
  const options: FilterOption[] = [];
  let otherCount = 0;
  for (const code of SUPPORTED_DENIAL_CODES) {
    let codeCount = 0;
    for (const codeTotal of codeCounts) {
      if (codeTotal.code === code) {
        codeCount = codeTotal.total;
      }
    }
    options.push({
      value: code,
      label: code,
      detail: denialCodeShortMeaning(code),
      count: codeCount,
    });
  }
  for (const codeTotal of codeCounts) {
    if (!SUPPORTED_DENIAL_CODES.includes(codeTotal.code)) {
      otherCount += codeTotal.total;
    }
  }
  options.push({
    value: OTHER_CODES_FILTER,
    label: "Other",
    detail: "Manual codes",
    count: otherCount,
  });
  return options;
}

async function loadPayerOptions(organizationId: string): Promise<FilterOption[]> {
  const payerCounts = await countOpenDenialsByPayer(db, organizationId);
  const options: FilterOption[] = [];
  for (const payerTotal of payerCounts) {
    options.push({
      value: payerTotal.payerId,
      label: payerTotal.name,
      detail: "",
      count: payerTotal.total,
    });
  }
  return options;
}

export async function loadQueueView(
  biller: SignedInBiller,
  filters: QueueFilters,
): Promise<QueueView> {
  const organizationId = biller.user.organizationId;
  const today = todayInTimezone(new Date(), biller.user.timezone);
  const page = await listQueuePage(db, organizationId, filters, today);
  const firstRank = (filters.page - 1) * QUEUE_PAGE_SIZE + 1;

  const rows: QueueRow[] = [];
  let rank = firstRank;
  for (const denialRow of page.rows) {
    const code = denialCode(denialRow.groupCode, denialRow.carcCode);
    rows.push({
      id: denialRow.id,
      rank,
      claimNumber: denialRow.patientControlNumber,
      payerName: denialRow.payerName,
      code,
      codeShortMeaning: denialCodeShortMeaning(code),
      amountAtStakeCents: denialRow.amountAtStakeCents,
      serviceDate: denialRow.serviceDate,
      appealDeadline: denialRow.appealDeadline,
      deadlineIsEstimate: denialRow.deadlineIsEstimate,
      status: denialRow.status,
      suggestedAction: defaultSuggestedAction(code),
    });
    rank += 1;
  }

  return {
    today,
    rows,
    matchingCount: page.matchingCount,
    firstRank,
    pageCount: Math.max(1, Math.ceil(page.matchingCount / QUEUE_PAGE_SIZE)),
    summary: await summarizeOpenDenials(db, organizationId, today),
    codeOptions: await loadCodeOptions(organizationId),
    payerOptions: await loadPayerOptions(organizationId),
    hasAnyDenials: (await countAllDenials(db, organizationId)) > 0,
  };
}
