"use client";

import { useRouter } from "next/navigation";
import { type DragEvent, useRef, useState } from "react";
import { UploadIcon } from "@/components/ui/icons";
import { ACCEPTED_EXTENSIONS, checkUploadFile, MAX_FILES_PER_BATCH } from "@/lib/upload-files";
import { uploadRemittanceFile } from "@/server/actions/uploads";
import { DropIllustration } from "./drop-illustration";
import { ProgressBar } from "./progress-bar";
import { UploadRowLayout } from "./upload-row-layout";

const NETWORK_FAILED_MESSAGE = "Upload failed. Nothing was saved. Try again.";
const OVER_BATCH_MESSAGE = "Upload these in another batch.";

// Files still in the browser. Once a file is queued it leaves this list and shows up
// in the stored upload list below, so it is never shown twice.
type LocalUpload = {
  key: number;
  file: File;
  state: "uploading" | "rejected" | "duplicate" | "failed";
  billerMessage: string | null;
  errorId: string | null;
  existingRemittanceId: string | null;
};

function badgeLabelFor(fileName: string): string {
  if (fileName.toLowerCase().endsWith(".pdf")) {
    return "PDF";
  }
  return "835";
}

export function UploadPanel() {
  const router = useRouter();
  const nextKey = useRef(0);
  const [localUploads, setLocalUploads] = useState<LocalUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  function updateUpload(key: number, changes: Partial<LocalUpload>) {
    setLocalUploads((current) => {
      const updated: LocalUpload[] = [];
      for (const upload of current) {
        if (upload.key === key) {
          updated.push({ ...upload, ...changes });
        } else {
          updated.push(upload);
        }
      }
      return updated;
    });
  }

  function removeUpload(key: number) {
    setLocalUploads((current) => current.filter((upload) => upload.key !== key));
  }

  async function sendFile(key: number, file: File) {
    updateUpload(key, { state: "uploading", billerMessage: null, errorId: null });
    const formData = new FormData();
    formData.set("file", file);
    try {
      const result = await uploadRemittanceFile(formData);
      if (result.outcome === "queued") {
        removeUpload(key);
      } else if (result.outcome === "duplicate") {
        updateUpload(key, {
          state: "duplicate",
          billerMessage: `${result.billerMessage} It was skipped.`,
          existingRemittanceId: result.existingRemittanceId,
        });
      } else if (result.outcome === "rejected") {
        updateUpload(key, { state: "rejected", billerMessage: result.billerMessage });
      } else {
        updateUpload(key, {
          state: "failed",
          billerMessage: result.billerMessage,
          errorId: result.errorId,
        });
      }
    } catch {
      // The request never reached the server, or the connection dropped mid-upload.
      updateUpload(key, { state: "failed", billerMessage: NETWORK_FAILED_MESSAGE });
    }
    router.refresh();
  }

  async function addFiles(fileList: FileList | null) {
    if (fileList === null) {
      return;
    }
    const newUploads: LocalUpload[] = [];
    let position = 0;
    for (const file of Array.from(fileList)) {
      position += 1;
      const key = nextKey.current;
      nextKey.current += 1;
      const fileCheck = checkUploadFile(file.name, file.size);
      let state: LocalUpload["state"] = "uploading";
      let billerMessage: string | null = null;
      if (position > MAX_FILES_PER_BATCH) {
        state = "rejected";
        billerMessage = OVER_BATCH_MESSAGE;
      } else if (!fileCheck.accepted) {
        state = "rejected";
        billerMessage = fileCheck.billerMessage;
      }
      newUploads.push({
        key,
        file,
        state,
        billerMessage,
        errorId: null,
        existingRemittanceId: null,
      });
    }
    setLocalUploads((current) => [...newUploads, ...current]);

    // One at a time, so each file gets its own result and the server isn't flooded.
    for (const upload of newUploads) {
      if (upload.state === "uploading") {
        await sendFile(upload.key, upload.file);
      }
    }
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
    void addFiles(event.dataTransfer.files);
  }

  const dropZoneBorder = isDragging
    ? "border-brand bg-brand-soft"
    : "border-brand-border bg-brand-tint";

  return (
    <>
      <section
        aria-label="Drop zone"
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative flex flex-wrap items-center justify-center gap-12 overflow-hidden rounded-[28px] border-2 border-dashed px-8 py-12 transition-colors ${dropZoneBorder}`}
      >
        <DropIllustration />
        <div className="flex max-w-[420px] flex-col items-start gap-3.5">
          <h2 className="m-0 text-2xl font-bold tracking-[-0.01em]">Drop files here</h2>
          <p className="m-0 text-[15px] leading-relaxed text-muted">
            We find every denial in them and add it to your queue. Files you&apos;ve uploaded before
            are skipped.
          </p>
          <label className="relative inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-brand px-5 text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_-8px_rgba(11,110,102,0.6)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand hover:bg-brand-dark">
            <UploadIcon />
            Choose files
            <input
              type="file"
              multiple
              accept={ACCEPTED_EXTENSIONS.join(",")}
              className="absolute h-px w-px opacity-0"
              onChange={(event) => {
                void addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          <span className="text-[13px] text-muted">Accepted: {ACCEPTED_EXTENSIONS.join(" ")}</span>
        </div>
      </section>

      {localUploads.length === 0 ? null : (
        <section
          aria-label="Files you just added"
          className="overflow-hidden rounded-[20px] border border-line bg-white"
        >
          <ul aria-live="polite" className="m-0 list-none p-0">
            {localUploads.map((upload) => (
              <LocalUploadRow
                key={upload.key}
                upload={upload}
                onRetry={() => void sendFile(upload.key, upload.file)}
              />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

type LocalUploadRowProps = {
  upload: LocalUpload;
  onRetry: () => void;
};

function LocalUploadRow({ upload, onRetry }: LocalUploadRowProps) {
  const fileName = upload.file.name;
  if (upload.state === "uploading") {
    return (
      <UploadRowLayout
        badgeLabel={badgeLabelFor(fileName)}
        badgeTone="remittance"
        fileName={fileName}
        detail={<ProgressBar label={`Uploading ${fileName}`} />}
        trailing={<span className="text-sm font-semibold text-brand-dark">Uploading</span>}
      />
    );
  }

  if (upload.state === "duplicate") {
    return (
      <UploadRowLayout
        badgeLabel={badgeLabelFor(fileName)}
        badgeTone="neutral"
        fileName={fileName}
        detail={<span className="text-[13px] text-muted">{upload.billerMessage}</span>}
        trailing={
          <a
            href={`#upload-${upload.existingRemittanceId ?? ""}`}
            className="text-sm font-semibold"
          >
            See that upload
          </a>
        }
      />
    );
  }

  const canRetry = upload.state === "failed";
  return (
    <UploadRowLayout
      badgeLabel={badgeLabelFor(fileName)}
      badgeTone="failed"
      fileName={fileName}
      detail={<span className="text-[13px] leading-normal text-bad">{upload.billerMessage}</span>}
      trailing={
        <>
          {upload.errorId === null ? null : (
            <span className="font-mono text-xs text-muted">Error ID {upload.errorId}</span>
          )}
          {canRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-10 items-center rounded-[10px] border border-line-strong px-3.5 text-sm font-semibold text-subtle hover:border-brand hover:text-brand"
            >
              Retry
            </button>
          ) : (
            <span className="text-sm font-semibold text-bad">Not uploaded</span>
          )}
        </>
      }
    />
  );
}
