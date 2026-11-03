import "server-only";
import { normalizeEmail } from "@/lib/login-rules";
import { hashSecretToken, newSecretToken } from "../auth/tokens";
import { db } from "../db/client";
import { findFirstOrganizationId, insertOrganization } from "../db/queries/organizations";
import { findFirstPracticeId, insertPractice } from "../db/queries/practices";
import { insertSetupToken } from "../db/queries/user-setup-tokens";
import { findUserByEmail, insertUser } from "../db/queries/users";

export const SETUP_LINK_VALID_HOURS = 24;
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

export type CreateBillerInput = {
  email: string;
  name: string;
  timezone: string;
  practiceName: string;
  appUrl: string;
};

export type CreateBillerResult = {
  userId: string;
  wasExistingUser: boolean;
  setupLink: string;
};

export function isKnownTimezone(timezone: string): boolean {
  return Intl.supportedValuesOf("timeZone").includes(timezone);
}

// Creates the organization and practice the first time, then the biller, and
// returns a one-time setup link. For an existing biller it only issues a new link.
export async function createBillerWithSetupLink(
  input: CreateBillerInput,
): Promise<CreateBillerResult> {
  const normalizedEmail = normalizeEmail(input.email);
  const setupToken = newSecretToken();
  const expiresAt = new Date(Date.now() + SETUP_LINK_VALID_HOURS * MILLISECONDS_PER_HOUR);

  const created = await db.transaction(async (transaction) => {
    const existingUser = await findUserByEmail(transaction, normalizedEmail);
    if (existingUser !== null) {
      await insertSetupToken(transaction, existingUser.id, hashSecretToken(setupToken), expiresAt);
      return { userId: existingUser.id, wasExistingUser: true };
    }

    let organizationId = await findFirstOrganizationId(transaction);
    if (organizationId === null) {
      organizationId = await insertOrganization(transaction, input.practiceName);
    }
    let practiceId = await findFirstPracticeId(transaction, organizationId);
    if (practiceId === null) {
      practiceId = await insertPractice(transaction, organizationId, input.practiceName);
    }
    const userId = await insertUser(transaction, {
      organizationId,
      practiceId,
      normalizedEmail,
      name: input.name,
      timezone: input.timezone,
    });
    await insertSetupToken(transaction, userId, hashSecretToken(setupToken), expiresAt);
    return { userId, wasExistingUser: false };
  });

  const setupLink = `${input.appUrl}/setup?token=${encodeURIComponent(setupToken)}`;
  return { userId: created.userId, wasExistingUser: created.wasExistingUser, setupLink };
}
