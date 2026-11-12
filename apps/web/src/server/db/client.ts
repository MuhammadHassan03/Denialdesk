import "server-only";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { drizzle, type PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readDatabaseUrl } from "../env";
import * as schema from "./schema";

// The database pool is one of the two allowed singletons (see AGENTS.md).
// postgres() connects on the first query, not here. With no URL set, pages that don't
// touch the database still build and run, and the first query fails against this
// address, which can never resolve.
const DATABASE_URL_NOT_SET = "postgres://database-url-not-set.invalid/denialdesk";
const connection = postgres(readDatabaseUrl() ?? DATABASE_URL_NOT_SET);

export const db = drizzle(connection, { schema });

// Either the pool or an open transaction. Query functions take this so callers
// can group several writes, such as a change and its audit event, in one transaction.
export type Database = PgDatabase<PostgresJsQueryResultHKT, typeof schema>;
