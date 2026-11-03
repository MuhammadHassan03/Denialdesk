import "server-only";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../client";
import { practices } from "../schema";

export async function findFirstPracticeId(
  database: Database,
  organizationId: string,
): Promise<string | null> {
  const rows = await database
    .select({ id: practices.id })
    .from(practices)
    .where(eq(practices.organizationId, organizationId))
    .orderBy(asc(practices.createdAt))
    .limit(1);
  const practiceRow = rows[0];
  if (practiceRow === undefined) {
    return null;
  }
  return z.string().uuid().parse(practiceRow.id);
}

export async function insertPractice(
  database: Database,
  organizationId: string,
  name: string,
): Promise<string> {
  const inserted = await database
    .insert(practices)
    .values({ organizationId, name })
    .returning({ id: practices.id });
  return z.string().uuid().parse(inserted[0]?.id);
}
