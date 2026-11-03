import { describe, expect, it } from "vitest";
import { summarizeRules } from "./rules-summary";

describe("summarizeRules", () => {
  it("passes when every check passes", () => {
    const summary = summarizeRules([
      { result: "pass", reason: "claim references match" },
      { result: "pass", reason: "cited policy exists" },
    ]);
    expect(summary).toEqual({
      overall: "pass",
      headline: "All 2 checks passed",
      warningText: null,
    });
  });

  it("lists warnings without blocking", () => {
    const summary = summarizeRules([
      { result: "pass", reason: "claim references match" },
      { result: "warn", reason: "deadline in 3 days" },
    ]);
    expect(summary.overall).toBe("warn");
    expect(summary.warningText).toBe("One warning: deadline in 3 days.");
  });

  it("counts problems when any check fails", () => {
    const summary = summarizeRules([
      { result: "fail", reason: "quote not found in the policy" },
      { result: "fail", reason: "placeholder left in the letter" },
      { result: "warn", reason: "deadline in 3 days" },
    ]);
    expect(summary).toEqual({ overall: "fail", headline: "2 problems to fix", warningText: null });
  });
});
