import { NextResponse, type NextRequest } from "next/server";

// Kept in step with server/auth/session.ts. Proxy can't import server-only code.
const SESSION_COOKIE_NAME = "denialdesk_session";
const REQUEST_PATH_HEADER = "x-denialdesk-path";

// A fast first check only: no cookie means straight to login. The real session
// check, including the idle timeout, is requireSession() in every page and action.
export function proxy(request: NextRequest) {
  const requestPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", requestPath);
    return NextResponse.redirect(loginUrl);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_PATH_HEADER, requestPath);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Everything except the public landing page "/", the sign-in pages and Next.js assets.
  // ".+" rather than ".*" is what leaves the bare "/" out.
  matcher: ["/((?!login|setup|_next/static|_next/image|favicon.ico).+)"],
};
