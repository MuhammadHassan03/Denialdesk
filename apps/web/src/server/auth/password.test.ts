import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("stores an argon2id hash, never the password", async () => {
    const storedHash = await hashPassword("correct horse battery");

    expect(storedHash.startsWith("$argon2id$v=19$m=19456,t=2,p=1$")).toBe(true);
    expect(storedHash).not.toContain("correct horse battery");
  });

  it("verifies the right password and rejects a wrong one", async () => {
    const storedHash = await hashPassword("correct horse battery");

    expect(await verifyPassword("correct horse battery", storedHash)).toBe(true);
    expect(await verifyPassword("wrong horse battery", storedHash)).toBe(false);
  });

  it("rejects a malformed stored hash", async () => {
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
  });
});
