import "server-only";
import { asc } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../client";
import { organizations } from "../schema";

export async function findFirstOrganizationId(database: Database): Promise<string | null> {
  const rows = await database
    .select({ id: organizations.id })
    .from(organizations)
    .orderBy(asc(organizations.createdAt))
    .limit(1);
  const organizationRow = rows[0];
  if (organizationRow === undefined) {
    return null;
  }
  return z.string().uuid().parse(organizationRow.id);
}

export async function insertOrganization(database: Database, name: string): Promise<string> {
  const inserted = await database
    .insert(organizations)
    .values({ name })
    .returning({ id: organizations.id });
  return z.string().uuid().parse(inserted[0]?.id);
}
