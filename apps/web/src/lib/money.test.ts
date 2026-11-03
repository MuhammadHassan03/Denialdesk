import { describe, expect, it } from "vitest";
import { formatCents } from "./money";

describe("formatCents", () => {
  it("formats whole cents as US dollars", () => {
    expect(formatCents(123456)).toBe("$1,234.56");
  });

  it("formats zero", () => {
    expect(formatCents(0)).toBe("$0.00");
  });

  it("formats negative adjustments", () => {
    expect(formatCents(-2500)).toBe("-$25.00");
  });

  it("rejects fractional cents", () => {
    expect(() => formatCents(10.5)).toThrow();
  });
});
