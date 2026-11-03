import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../db/client";
import { deleteSession, findSessionByTokenHash, touchSession } from "../db/queries/sessions";
import { findUserById, type UserRow } from "../db/queries/users";
import { hashSecretToken } from "./tokens";

export const SESSION_IDLE_TIMEOUT_MINUTES = 30;
export const SESSION_COOKIE_NAME = "denialdesk_session";
// Set by proxy.ts so server code knows which page to come back to after login.
export const REQUEST_PATH_HEADER = "x-denialdesk-path";

const MILLISECONDS_PER_MINUTE = 60 * 1000;
const SESSION_IDLE_TIMEOUT_MS = SESSION_IDLE_TIMEOUT_MINUTES * MILLISECONDS_PER_MINUTE;

export type SignedInBiller = {
  sessionId: string;
  user: UserRow;
};

export type SessionCheck =
  { signedIn: true; biller: SignedInBiller } | { signedIn: false; reason: "no_session" | "idle" };

export function isSessionIdle(lastSeenAt: Date, now: Date): boolean {
  return now.getTime() - lastSeenAt.getTime() > SESSION_IDLE_TIMEOUT_MS;
}

export async function checkSession(): Promise<SessionCheck> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (sessionToken === undefined) {
    return { signedIn: false, reason: "no_session" };
  }

  const session = await findSessionByTokenHash(db, hashSecretToken(sessionToken));
  if (session === null) {
    return { signedIn: false, reason: "no_session" };
  }
  if (isSessionIdle(session.lastSeenAt, new Date())) {
    await deleteSession(db, session.id);
    return { signedIn: false, reason: "idle" };
  }

  const user = await findUserById(db, session.userId);
  if (user === null) {
    return { signedIn: false, reason: "no_session" };
  }
  await touchSession(db, session.id);
  return { signedIn: true, biller: { sessionId: session.id, user } };
}

// Call first in every signed-in page and every server action.
export async function requireSession(): Promise<SignedInBiller> {
  const sessionCheck = await checkSession();
  if (sessionCheck.signedIn) {
    return sessionCheck.biller;
  }

  const requestHeaders = await headers();
  const loginParams = new URLSearchParams();
  const requestPath = requestHeaders.get(REQUEST_PATH_HEADER);
  if (requestPath !== null) {
    loginParams.set("next", requestPath);
  }
  if (sessionCheck.reason === "idle") {
    loginParams.set("reason", "idle");
  }
  redirect(`/login?${loginParams.toString()}`);
}
