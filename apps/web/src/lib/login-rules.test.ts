import { describe, expect, it } from "vitest";
import { isPasswordLongEnough, normalizeEmail, safePathAfterLogin } from "./login-rules";

describe("safePathAfterLogin", () => {
  it("keeps a relative path", () => {
    expect(safePathAfterLogin("/denials/abc?tab=history")).toBe("/denials/abc?tab=history");
  });

  it("goes to the queue when there is no path", () => {
    expect(safePathAfterLogin(null)).toBe("/queue");
  });

  it("ignores another site", () => {
    expect(safePathAfterLogin("https://evil.example.com")).toBe("/queue");
  });

  it("ignores protocol-relative and backslash tricks", () => {
    expect(safePathAfterLogin("//evil.example.com")).toBe("/queue");
    expect(safePathAfterLogin("/\\evil.example.com")).toBe("/queue");
  });

  it("does not loop back to the login page", () => {
    expect(safePathAfterLogin("/login?next=/queue")).toBe("/queue");
  });
});

describe("password and email rules", () => {
  it("needs at least 12 characters", () => {
    expect(isPasswordLongEnough("elevenchars")).toBe(false);
    expect(isPasswordLongEnough("twelve chars")).toBe(true);
  });

  it("lower-cases and trims email", () => {
    expect(normalizeEmail("  Biller@Example.COM ")).toBe("biller@example.com");
  });
});
