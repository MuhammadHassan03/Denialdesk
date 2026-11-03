"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const POLL_INTERVAL_MS = 3000;

type UploadStatusPollerProps = {
  anyInProgress: boolean;
};

// Re-reads the upload list every 3 seconds while anything is queued or processing (F2).
export function UploadStatusPoller({ anyInProgress }: UploadStatusPollerProps) {
  const router = useRouter();

  useEffect(() => {
    if (!anyInProgress) {
      return;
    }
    const intervalId = window.setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [anyInProgress, router]);

  return null;
}
