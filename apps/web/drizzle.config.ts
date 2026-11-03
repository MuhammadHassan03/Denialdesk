import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

// One .env at the repo root serves the web app, the pipeline and the scripts.
const rootEnvPath = path.resolve(process.cwd(), "../../.env");
if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "../../db/migrations",
  dbCredentials: { url: databaseUrl },
});
