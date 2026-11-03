import { describe, expect, it } from "vitest";
import {
  addDays,
  daysUntil,
  formatIsoDate,
  formatMonthDay,
  formatTimestamp,
  isDeadlineSoon,
  todayInTimezone,
} from "./dates";

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

describe("formatIsoDate", () => {
  it("writes the month as a word", () => {
    expect(formatIsoDate("2026-09-02")).toBe("Sep 2, 2026");
  });
});

describe("formatMonthDay", () => {
  it("leaves out the year", () => {
    expect(formatMonthDay("2026-11-07")).toBe("Nov 7");
  });
});

describe("addDays", () => {
  it("moves across a month end", () => {
    expect(addDays("2026-10-30", 7)).toBe("2026-11-06");
  });

  it("goes back with a negative count", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("todayInTimezone", () => {
  it("uses the biller's calendar day, not UTC's", () => {
    const lateEveningInNewYork = new Date("2026-11-05T02:30:00Z");
    expect(todayInTimezone(lateEveningInNewYork, "America/New_York")).toBe("2026-11-04");
  });
});

describe("formatTimestamp", () => {
  it("shows the time in the biller's time zone", () => {
    const timestamp = new Date("2026-11-04T15:12:00Z");
    expect(formatTimestamp(timestamp, "America/New_York")).toBe("Nov 4, 10:12 AM");
  });
});
