import { z } from "zod";
import { DENIAL_STATUSES, type DenialStatus } from "./denial-status";

// Queue filters live in the URL so a filtered view can be bookmarked (F4).

export const OTHER_CODES_FILTER = "other";

export type StatusFilter = "open" | "all" | DenialStatus;
export type DueFilter = "overdue" | "7" | "30" | "any";

export type QueueFilters = {
  status: StatusFilter;
  codes: string[];
  payerIds: string[];
  due: DueFilter;
  search: string;
  page: number;
};

export type QueueSearchParams = Record<string, string | string[] | undefined>;

const statusFilterSchema = z.enum(["open", "all", ...DENIAL_STATUSES]).catch("open");
const dueFilterSchema = z.enum(["overdue", "7", "30", "any"]).catch("any");
const pageSchema = z.coerce.number().int().min(1).catch(1);

function asList(rawValue: string | string[] | undefined): string[] {
  if (rawValue === undefined) {
    return [];
  }
  if (typeof rawValue === "string") {
    return [rawValue];
  }
  return rawValue;
}

function firstValue(rawValue: string | string[] | undefined): string | undefined {
  return asList(rawValue)[0];
}

// Bad or unknown values fall back to the defaults instead of failing the page.
export function parseQueueFilters(searchParams: QueueSearchParams): QueueFilters {
  return {
    status: statusFilterSchema.parse(firstValue(searchParams.status)),
    codes: asList(searchParams.code),
    payerIds: asList(searchParams.payer),
    due: dueFilterSchema.parse(firstValue(searchParams.due)),
    search: (firstValue(searchParams.q) ?? "").trim(),
    page: pageSchema.parse(firstValue(searchParams.page)),
  };
}

export function queueFiltersToQueryString(filters: QueueFilters): string {
  const query = new URLSearchParams();
  if (filters.status !== "open") {
    query.set("status", filters.status);
  }
  for (const code of filters.codes) {
    query.append("code", code);
  }
  for (const payerId of filters.payerIds) {
    query.append("payer", payerId);
  }
  if (filters.due !== "any") {
    query.set("due", filters.due);
  }
  if (filters.search !== "") {
    query.set("q", filters.search);
  }
  if (filters.page > 1) {
    query.set("page", String(filters.page));
  }
  return query.toString();
}

export function hasActiveFilters(filters: QueueFilters): boolean {
  const hasCodes = filters.codes.length > 0;
  const hasPayers = filters.payerIds.length > 0;
  return (
    filters.status !== "open" ||
    hasCodes ||
    hasPayers ||
    filters.due !== "any" ||
    filters.search !== ""
  );
}
