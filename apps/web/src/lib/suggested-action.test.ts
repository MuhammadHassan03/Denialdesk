import { describe, expect, it } from "vitest";
import { nextStepLabel } from "./suggested-action";

describe("nextStepLabel", () => {
  it("asks to confirm details for EOB denials", () => {
    expect(nextStepLabel("needs_check", "appeal")).toBe("Confirm details");
  });

  it("sends manual codes to manual review", () => {
    expect(nextStepLabel("manual", "review_manually")).toBe("Review manually");
  });

  it("offers the draft once it exists", () => {
    expect(nextStepLabel("in_review", "fix")).toBe("Review draft");
  });

  it("offers export once approved", () => {
    expect(nextStepLabel("approved", "appeal")).toBe("Export");
  });

  it("names the suggested action on new denials", () => {
    expect(nextStepLabel("new", "appeal")).toBe("Appeal");
    expect(nextStepLabel("new", "fix")).toBe("Fix claim");
    expect(nextStepLabel("new", "write_off")).toBe("Write off?");
  });
});
