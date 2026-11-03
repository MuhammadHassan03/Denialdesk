import type { Metadata } from "next";
import { RecentUploads } from "@/components/upload/recent-uploads";
import { UploadPanel } from "@/components/upload/upload-panel";
import { UploadStatusPoller } from "@/components/upload/upload-status-poller";
import { MAX_FILE_SIZE_MB, MAX_FILES_PER_BATCH } from "@/lib/upload-files";
import { requireSession } from "@/server/auth/session";
import { loadUploadPageView } from "@/server/views/upload-view";

export const metadata: Metadata = {
  title: "Upload files · Denialdesk",
};

export default async function UploadPage() {
  const biller = await requireSession();
  const uploadPage = await loadUploadPageView(biller);

  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-7 px-4 py-8 sm:px-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[32px] font-bold tracking-[-0.02em]">Upload files</h1>
        <p className="m-0 text-[15px] text-muted">
          835 remittance files or EOB PDFs. Up to {MAX_FILES_PER_BATCH} files, {MAX_FILE_SIZE_MB} MB
          each.
        </p>
      </div>
      <UploadPanel />
      <RecentUploads rows={uploadPage.rows} />
      <UploadStatusPoller anyInProgress={uploadPage.anyInProgress} />
    </main>
  );
}
