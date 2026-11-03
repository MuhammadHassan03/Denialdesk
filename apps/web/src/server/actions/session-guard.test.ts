import { beforeEach, describe, expect, it, vi } from "vitest";
import { signOut } from "./auth";
import { retryRemittanceProcessing, uploadRemittanceFile } from "./uploads";

// No session cookie, and redirect() stops the action the way it does in Next.js.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

describe("signed-in server actions without a session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upload redirects to login", async () => {
    const formData = new FormData();
    formData.set("file", new File(["ISA"], "remit.835"));

    await expect(uploadRemittanceFile(formData)).rejects.toThrow("redirect:/login");
  });

  it("retry processing redirects to login", async () => {
    await expect(retryRemittanceProcessing(new FormData())).rejects.toThrow("redirect:/login");
  });

  it("sign out redirects to login", async () => {
    await expect(signOut()).rejects.toThrow("redirect:/login");
  });
});
