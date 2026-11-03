import { describe, expect, it } from "vitest";
import { hasActiveFilters, parseQueueFilters, queueFiltersToQueryString } from "./queue-filters";

describe("parseQueueFilters", () => {
  it("defaults to open denials, any due date, first page", () => {
    expect(parseQueueFilters({})).toEqual({
      status: "open",
      codes: [],
      payerIds: [],
      due: "any",
      search: "",
      page: 1,
    });
  });

  it("reads repeated codes and payers", () => {
    const filters = parseQueueFilters({ code: ["CO-50", "CO-4"], payer: "northwind" });
    expect(filters.codes).toEqual(["CO-50", "CO-4"]);
    expect(filters.payerIds).toEqual(["northwind"]);
  });

  it("falls back to defaults on unknown values", () => {
    const filters = parseQueueFilters({ status: "lost", due: "soon", page: "-3" });
    expect(filters.status).toBe("open");
    expect(filters.due).toBe("any");
    expect(filters.page).toBe(1);
  });

  it("accepts a single status", () => {
    expect(parseQueueFilters({ status: "in_review" }).status).toBe("in_review");
  });

  it("trims the search text", () => {
    expect(parseQueueFilters({ q: "  CLM-20517 " }).search).toBe("CLM-20517");
  });
});

describe("queueFiltersToQueryString", () => {
  it("leaves out defaults", () => {
    expect(queueFiltersToQueryString(parseQueueFilters({}))).toBe("");
  });

  it("round-trips through the parser", () => {
    const filters = parseQueueFilters({ status: "all", code: ["CO-50"], due: "7", page: "2" });
    const query = queueFiltersToQueryString(filters);
    const reparsed = parseQueueFilters(Object.fromEntries(new URLSearchParams(query)));
    expect(reparsed).toEqual(filters);
  });
});

describe("hasActiveFilters", () => {
  it("is false for the default view", () => {
    expect(hasActiveFilters(parseQueueFilters({}))).toBe(false);
  });

  it("is true once a filter is set", () => {
    expect(hasActiveFilters(parseQueueFilters({ due: "overdue" }))).toBe(true);
  });
});
