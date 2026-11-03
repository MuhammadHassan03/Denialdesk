import { describe, expect, it } from "vitest";
import { describeHistoryEvent } from "./history-words";

describe("describeHistoryEvent", () => {
  it("names the file a denial came from", () => {
    const words = describeHistoryEvent({
      action: "denial_created",
      actor: "system",
      draftVersion: null,
      sourceFilename: "remit_1102.835",
    });
    expect(words).toBe("Created from remit_1102.835");
  });

  it("says who wrote a draft version", () => {
    const words = describeHistoryEvent({
      action: "draft_created",
      actor: "system",
      draftVersion: 2,
      sourceFilename: null,
    });
    expect(words).toBe("AI wrote draft version 2");
  });

  it("describes an approval", () => {
    const words = describeHistoryEvent({
      action: "approved",
      actor: "user",
      draftVersion: 3,
      sourceFilename: null,
    });
    expect(words).toBe("You approved draft version 3");
  });

  it("falls back for an action it doesn't know", () => {
    const words = describeHistoryEvent({
      action: "login",
      actor: "user",
      draftVersion: null,
      sourceFilename: null,
    });
    expect(words).toBe("Something changed");
  });
});
