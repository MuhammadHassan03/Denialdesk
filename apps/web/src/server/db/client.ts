import "server-only";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { drizzle, type PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readServerEnv } from "../env";
import * as schema from "./schema";

// The database pool is one of the two allowed singletons (see AGENTS.md).
const env = readServerEnv();
const connection = postgres(env.DATABASE_URL);

export const db = drizzle(connection, { schema });

// Either the pool or an open transaction. Query functions take this so callers
// can group several writes, such as a change and its audit event, in one transaction.
export type Database = PgDatabase<PostgresJsQueryResultHKT, typeof schema>;
