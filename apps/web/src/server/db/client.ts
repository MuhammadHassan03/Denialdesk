import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readServerEnv } from "../env";
import * as schema from "./schema";

// The database pool is one of the two allowed singletons (see AGENTS.md).
const env = readServerEnv();
const connection = postgres(env.DATABASE_URL);

export const db = drizzle(connection, { schema });
