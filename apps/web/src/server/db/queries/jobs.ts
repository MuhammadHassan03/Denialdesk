import "server-only";
import type { Database } from "../client";
import { jobs } from "../schema";

export async function queueProcessRemittanceJob(
  database: Database,
  remittanceId: string,
): Promise<void> {
  await database.insert(jobs).values({ kind: "process_remittance", remittanceId });
}
