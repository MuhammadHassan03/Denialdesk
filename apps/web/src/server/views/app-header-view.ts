import "server-only";
import { todayInTimezone } from "@/lib/dates";
import type { SignedInBiller } from "../auth/session";
import { db } from "../db/client";
import { summarizeOpenDenials } from "../db/queries/denial-queue";

export type AppHeaderView = {
  billerName: string;
  billerInitials: string;
  openDenialCount: number;
};

function initialsOf(name: string): string {
  const words = name.trim().split(" ");
  let initials = "";
  for (const word of words) {
    if (word !== "" && initials.length < 2) {
      initials += word.charAt(0).toUpperCase();
    }
  }
  return initials;
}

export async function loadAppHeaderView(biller: SignedInBiller): Promise<AppHeaderView> {
  const today = todayInTimezone(new Date(), biller.user.timezone);
  const summary = await summarizeOpenDenials(db, biller.user.organizationId, today);
  return {
    billerName: biller.user.name,
    billerInitials: initialsOf(biller.user.name),
    openDenialCount: summary.openCount,
  };
}
