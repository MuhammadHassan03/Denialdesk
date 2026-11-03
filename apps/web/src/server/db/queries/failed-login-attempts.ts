import "server-only";
import { and, count, eq, gte } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../client";
import { failedLoginAttempts } from "../schema";

export async function recordFailedLogin(
  database: Database,
  normalizedEmail: string,
): Promise<void> {
  await database.insert(failedLoginAttempts).values({ email: normalizedEmail });
}

export async function countFailedLoginsSince(
  database: Database,
  normalizedEmail: string,
  since: Date,
): Promise<number> {
  const rows = await database
    .select({ attemptCount: count() })
    .from(failedLoginAttempts)
    .where(
      and(
        eq(failedLoginAttempts.email, normalizedEmail),
        gte(failedLoginAttempts.attemptedAt, since),
      ),
    );
  return z
    .number()
    .int()
    .parse(rows[0]?.attemptCount ?? 0);
}
