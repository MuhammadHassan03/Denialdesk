import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DenialScreen } from "@/components/denial/denial-screen";
import { requireSession } from "@/server/auth/session";
import { buildPreviewDenialPage } from "@/server/views/synthetic-denial-details";

export const metadata: Metadata = {
  title: "Denial design preview · Denialdesk",
};

// Shows the draft, rules check and policy panels on synthetic data until drafting
// (F6, F7) exists. Never served in production.
export default async function DenialPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  await requireSession();
  return <DenialScreen denial={buildPreviewDenialPage()} />;
}
