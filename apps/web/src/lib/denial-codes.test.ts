import { describe, expect, it } from "vitest";
import {
  defaultSuggestedAction,
  denialCode,
  denialCodeShortMeaning,
  isSupportedDenialCode,
} from "./denial-codes";

describe("denialCode", () => {
  it("joins the group and reason code", () => {
    expect(denialCode("CO", "197")).toBe("CO-197");
  });
});

describe("supported codes", () => {
  it("knows the five codes we draft for", () => {
    expect(isSupportedDenialCode("CO-50")).toBe(true);
    expect(isSupportedDenialCode("OA-23")).toBe(false);
  });

  it("suggests a corrected claim for a modifier problem", () => {
    expect(defaultSuggestedAction("CO-4")).toBe("fix");
  });

  it("sends other codes to manual review", () => {
    expect(defaultSuggestedAction("PI-96")).toBe("review_manually");
    expect(denialCodeShortMeaning("PI-96")).toBe("Review manually");
  });
});
