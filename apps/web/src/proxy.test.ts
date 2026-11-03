import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "./proxy";

const SIGNED_IN_ROUTES = ["/queue", "/upload", "/stats", "/denials/123"];

function matchesProxy(pathname: string): boolean {
  const matcher = config.matcher[0] ?? "";
  // Next.js matchers are path-to-regexp patterns. This one is a plain regex group after "/".
  const pattern = new RegExp(`^${matcher}$`);
  return pattern.test(pathname);
}

describe("proxy", () => {
  it.each(SIGNED_IN_ROUTES)("sends %s to login when there is no session cookie", (pathname) => {
    const response = proxy(new NextRequest(`http://localhost:3000${pathname}?page=2`));

    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe(`${pathname}?page=2`);
  });

  it("lets a request with a session cookie through for the full check", () => {
    const request = new NextRequest("http://localhost:3000/queue", {
      headers: { cookie: "denialdesk_session=some-token" },
    });

    const response = proxy(request);

    expect(response.headers.get("location")).toBeNull();
  });

  it.each(SIGNED_IN_ROUTES)("runs on %s", (pathname) => {
    expect(matchesProxy(pathname)).toBe(true);
  });

  it.each(["/", "/login", "/setup", "/_next/static/chunk.js"])("skips %s", (pathname) => {
    expect(matchesProxy(pathname)).toBe(false);
  });
});
