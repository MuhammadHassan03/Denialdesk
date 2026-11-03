import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { DenialScreen } from "@/components/denial/denial-screen";
import { parseQueueFilters, type QueueSearchParams } from "@/lib/queue-filters";
import { requireSession } from "@/server/auth/session";
import { loadDenialPageView } from "@/server/views/denial-view";

export const metadata: Metadata = {
  title: "Denial · Denialdesk",
};

type DenialPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<QueueSearchParams>;
};

const denialIdSchema = z.string().uuid();

function DenialNotFound() {
  return (
    <main className="mx-auto flex max-w-[1320px] flex-col items-start gap-4 px-4 py-16 sm:px-8">
      <h1 className="m-0 text-2xl font-bold">This denial doesn&rsquo;t exist or was removed.</h1>
      <Link href="/queue" className="font-semibold">
        Back to the queue
      </Link>
    </main>
  );
}

export default async function DenialPage({ params, searchParams }: DenialPageProps) {
  const biller = await requireSession();
  const { id } = await params;
  const parsedId = denialIdSchema.safeParse(id);
  if (!parsedId.success) {
    return <DenialNotFound />;
  }
  const filters = parseQueueFilters(await searchParams);
  // Another organization's denial reads as not found too, so its existence never leaks (F5).
  const denial = await loadDenialPageView(biller, parsedId.data, filters);
  if (denial === null) {
    return <DenialNotFound />;
  }
  return <DenialScreen denial={denial} />;
}
