import { describe, expect, it } from "vitest";
import type { RemittanceRow } from "../db/queries/remittances";
import { describeUpload } from "./upload-view";

const TIMEZONE = "America/Chicago";

function remittance(overrides: Partial<RemittanceRow>): RemittanceRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    source: "835",
    status: "done",
    originalFilename: "remit_1102.835",
    denialCount: null,
    resultSummary: null,
    billerMessage: null,
    errorId: null,
    createdAt: new Date("2026-11-03T22:12:00Z"),
    ...overrides,
  };
}

const SUMMARY = {
  claims_total: 42,
  claims_without_denials: 28,
  already_in_queue: 0,
  reversals_seen: 0,
  denials_created: 14,
};

describe("describeUpload", () => {
  it("shows new denials with a link to the queue", () => {
    const row = describeUpload(remittance({ resultSummary: SUMMARY, denialCount: 14 }), TIMEZONE);

    expect(row.statusText).toBe("Done: 14 new denials");
    expect(row.detailText).toBe("Nov 3, 4:12 PM · 42 claims read");
    expect(row.showQueueLink).toBe(true);
  });

  it("says when every denial was already in the queue", () => {
    const summary = { ...SUMMARY, denials_created: 0, already_in_queue: 6 };

    const row = describeUpload(remittance({ resultSummary: summary, denialCount: 0 }), TIMEZONE);

    expect(row.statusText).toBe("Done: no new denials");
    expect(row.detailText).toContain("6 already in your queue");
    expect(row.showQueueLink).toBe(false);
  });

  it("shows the pipeline's message when a file has no denials", () => {
    const summary = { ...SUMMARY, denials_created: 0 };
    const message = "No denials in this file. 42 claims were paid in full.";

    const row = describeUpload(
      remittance({ resultSummary: summary, denialCount: 0, billerMessage: message }),
      TIMEZONE,
    );

    expect(row.statusText).toBe("Done: no denials");
    expect(row.detailText).toBe(`Nov 3, 4:12 PM · ${message}`);
  });

  it("marks queued and processing uploads as in progress", () => {
    expect(describeUpload(remittance({ status: "queued" }), TIMEZONE).isInProgress).toBe(true);
    expect(describeUpload(remittance({ status: "processing" }), TIMEZONE).statusText).toBe(
      "Processing",
    );
  });

  it("offers a retry only when processing crashed", () => {
    const crashed = describeUpload(
      remittance({
        status: "failed",
        errorId: "a1b2c3d4e5f6",
        billerMessage: "Processing failed.",
      }),
      TIMEZONE,
    );
    const wrongFile = describeUpload(
      remittance({ status: "failed", billerMessage: "This is an 837 claim file." }),
      TIMEZONE,
    );

    expect(crashed.canRetry).toBe(true);
    expect(crashed.errorId).toBe("a1b2c3d4e5f6");
    expect(wrongFile.canRetry).toBe(false);
    expect(wrongFile.detailText).toBe("This is an 837 claim file.");
  });

  it("labels EOBs as PDF", () => {
    expect(describeUpload(remittance({ source: "EOB" }), TIMEZONE).sourceLabel).toBe("PDF");
  });
});
