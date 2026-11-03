import { describe, expect, it } from "vitest";
import { daysUntil, isDeadlineSoon } from "./dates";

describe("daysUntil", () => {
  it("counts calendar days between two dates", () => {
    expect(daysUntil("2026-03-10", "2026-03-01")).toBe(9);
  });

  it("is negative when the deadline has passed", () => {
    expect(daysUntil("2026-02-27", "2026-03-01")).toBe(-2);
  });

  it("rejects dates that are not on the calendar", () => {
    expect(() => daysUntil("2026-02-30", "2026-03-01")).toThrow();
  });

  it("rejects dates with a time part", () => {
    expect(() => daysUntil("2026-03-10T00:00:00Z", "2026-03-01")).toThrow();
  });
});

describe("isDeadlineSoon", () => {
  it("warns on the seventh day", () => {
    expect(isDeadlineSoon("2026-03-08", "2026-03-01")).toBe(true);
  });

  it("does not warn on the eighth day", () => {
    expect(isDeadlineSoon("2026-03-09", "2026-03-01")).toBe(false);
  });
});
