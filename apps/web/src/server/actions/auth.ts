"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  isPasswordLongEnough,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  safePathAfterLogin,
} from "@/lib/login-rules";
import { isLockedOut, lockoutWindowStart } from "../auth/login-lockout";
import { hashPassword, verifyPassword } from "../auth/password";
import { requireSession, SESSION_COOKIE_NAME } from "../auth/session";
import { hashSecretToken, newSecretToken } from "../auth/tokens";
import { db } from "../db/client";
import { insertAuditEvent } from "../db/queries/audit-events";
import { countFailedLoginsSince, recordFailedLogin } from "../db/queries/failed-login-attempts";
import { deleteSession, insertSession } from "../db/queries/sessions";
import { findSetupTokenByHash, markSetupTokenUsed } from "../db/queries/user-setup-tokens";
import { findUserByEmail, setUserPasswordHash } from "../db/queries/users";
import { logServerEvent } from "../errors";

export type AuthFormState = {
  billerMessage: string | null;
};

const WRONG_CREDENTIALS_MESSAGE = "Email or password is incorrect.";
const LOCKED_OUT_MESSAGE = "Too many attempts. Try again in 15 minutes.";
const EXPIRED_SETUP_LINK_MESSAGE = "This link has expired. Ask for a new one.";

const signInFormSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
  next: z.string().nullable(),
});

const setupFormSchema = z.object({
  token: z.string().min(1),
  password: z.string(),
});

export async function signIn(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsedForm = signInFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });
  if (!parsedForm.success) {
    return { billerMessage: WRONG_CREDENTIALS_MESSAGE };
  }

  const email = normalizeEmail(parsedForm.data.email);
  const password = parsedForm.data.password;
  const recentFailures = await countFailedLoginsSince(db, email, lockoutWindowStart(new Date()));
  if (isLockedOut(recentFailures)) {
    await insertAuditEvent(db, {
      organizationId: null,
      userId: null,
      action: "login_failed",
      details: { reason: "locked_out" },
    });
    logServerEvent("login_locked_out", { recentFailures });
    return { billerMessage: LOCKED_OUT_MESSAGE };
  }

  const user = await findUserByEmail(db, email);
  let passwordMatches = false;
  if (user !== null && user.passwordHash !== null) {
    passwordMatches = await verifyPassword(password, user.passwordHash);
  } else {
    // Spend the same time as a real check, so response time doesn't reveal which emails exist.
    await hashPassword(password);
  }

  if (user === null || !passwordMatches) {
    await db.transaction(async (transaction) => {
      await recordFailedLogin(transaction, email);
      await insertAuditEvent(transaction, {
        organizationId: user?.organizationId ?? null,
        userId: null,
        action: "login_failed",
        details: { reason: "wrong_credentials", targetUserId: user?.id ?? null },
      });
    });
    return { billerMessage: WRONG_CREDENTIALS_MESSAGE };
  }

  const sessionToken = newSecretToken();
  await db.transaction(async (transaction) => {
    await insertSession(transaction, user.id, hashSecretToken(sessionToken));
    await insertAuditEvent(transaction, {
      organizationId: user.organizationId,
      userId: user.id,
      action: "login",
    });
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });
  redirect(safePathAfterLogin(parsedForm.data.next));
}

export async function signOut(): Promise<void> {
  const biller = await requireSession();
  await db.transaction(async (transaction) => {
    await deleteSession(transaction, biller.sessionId);
    await insertAuditEvent(transaction, {
      organizationId: biller.user.organizationId,
      userId: biller.user.id,
      action: "logout",
    });
  });
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}

export async function completeAccountSetup(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsedForm = setupFormSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsedForm.success) {
    return { billerMessage: EXPIRED_SETUP_LINK_MESSAGE };
  }
  if (!isPasswordLongEnough(parsedForm.data.password)) {
    return { billerMessage: `Use at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const setupToken = await findSetupTokenByHash(db, hashSecretToken(parsedForm.data.token));
  const linkIsUsable =
    setupToken !== null && setupToken.usedAt === null && setupToken.expiresAt > new Date();
  if (setupToken === null || !linkIsUsable) {
    return { billerMessage: EXPIRED_SETUP_LINK_MESSAGE };
  }

  const passwordHash = await hashPassword(parsedForm.data.password);
  await db.transaction(async (transaction) => {
    await setUserPasswordHash(transaction, setupToken.userId, passwordHash);
    await markSetupTokenUsed(transaction, setupToken.id);
  });
  redirect("/login?reason=password_set");
}
