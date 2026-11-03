import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../client";
import { users } from "../schema";

const userRowSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  practiceId: z.string().uuid(),
  email: z.string(),
  name: z.string(),
  timezone: z.string(),
  role: z.literal("biller"),
  passwordHash: z.string().nullable(),
});

export type UserRow = z.infer<typeof userRowSchema>;

export async function findUserByEmail(
  database: Database,
  normalizedEmail: string,
): Promise<UserRow | null> {
  const rows = await database.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  const userRow = rows[0];
  if (userRow === undefined) {
    return null;
  }
  return userRowSchema.parse(userRow);
}

export async function findUserById(database: Database, userId: string): Promise<UserRow | null> {
  const rows = await database.select().from(users).where(eq(users.id, userId)).limit(1);
  const userRow = rows[0];
  if (userRow === undefined) {
    return null;
  }
  return userRowSchema.parse(userRow);
}

export type NewUser = {
  organizationId: string;
  practiceId: string;
  normalizedEmail: string;
  name: string;
  timezone: string;
};

export async function insertUser(database: Database, newUser: NewUser): Promise<string> {
  const inserted = await database
    .insert(users)
    .values({
      organizationId: newUser.organizationId,
      practiceId: newUser.practiceId,
      email: newUser.normalizedEmail,
      name: newUser.name,
      timezone: newUser.timezone,
      role: "biller",
    })
    .returning({ id: users.id });
  return z.string().uuid().parse(inserted[0]?.id);
}

export async function setUserPasswordHash(
  database: Database,
  userId: string,
  passwordHash: string,
): Promise<void> {
  await database.update(users).set({ passwordHash }).where(eq(users.id, userId));
}
