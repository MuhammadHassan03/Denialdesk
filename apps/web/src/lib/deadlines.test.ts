import { describe, expect, it } from "vitest";
import { describeDeadline } from "./deadlines";

const TODAY = "2026-11-04";

describe("describeDeadline", () => {
  it("counts days overdue", () => {
    expect(describeDeadline("2026-11-02", TODAY, false)).toEqual({
      urgency: "overdue",
      label: "Overdue 2 days",
      daysLeft: -2,
    });
  });

  it("uses a singular day", () => {
    expect(describeDeadline("2026-11-03", TODAY, false).label).toBe("Overdue 1 day");
  });

  it("says due today on the deadline", () => {
    expect(describeDeadline(TODAY, TODAY, false)).toEqual({
      urgency: "soon",
      label: "Due today",
      daysLeft: 0,
    });
  });

  it("warns within seven days", () => {
    expect(describeDeadline("2026-11-11", TODAY, false).urgency).toBe("soon");
  });

  it("does not warn after seven days", () => {
    expect(describeDeadline("2026-11-12", TODAY, false)).toEqual({
      urgency: "later",
      label: "Due in 8 days",
      daysLeft: 8,
    });
  });

  it("marks estimated deadlines", () => {
    expect(describeDeadline("2026-11-10", TODAY, true).label).toBe("Due in 6 days (est.)");
  });
});
