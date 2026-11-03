import "server-only";
import { formatTimestamp } from "@/lib/dates";
import type { SignedInBiller } from "../auth/session";
import { db } from "../db/client";
import { listRecentRemittances, type RemittanceRow } from "../db/queries/remittances";

export type UploadRowTone = "working" | "done" | "attention" | "failed";

export type UploadRowView = {
  id: string;
  fileName: string;
  sourceLabel: "835" | "PDF";
  tone: UploadRowTone;
  statusText: string;
  detailText: string;
  detailIsError: boolean;
  errorId: string | null;
  isInProgress: boolean;
  canRetry: boolean;
  showQueueLink: boolean;
};

export type UploadPageView = {
  rows: UploadRowView[];
  anyInProgress: boolean;
};

function countOf(count: number, singular: string, plural: string): string {
  if (count === 1) {
    return `1 ${singular}`;
  }
  return `${count} ${plural}`;
}

type DoneCounts = {
  denialsCreated: number;
  alreadyInQueue: number;
  claimsTotal: number;
};

function doneCounts(remittance: RemittanceRow): DoneCounts {
  const summary = remittance.resultSummary;
  if (summary === null) {
    return { denialsCreated: remittance.denialCount ?? 0, alreadyInQueue: 0, claimsTotal: 0 };
  }
  return {
    denialsCreated: summary.denials_created,
    alreadyInQueue: summary.already_in_queue,
    claimsTotal: summary.claims_total,
  };
}

function doneStatusText(counts: DoneCounts, prefix: string): string {
  if (counts.denialsCreated > 0) {
    return `${prefix}: ${countOf(counts.denialsCreated, "new denial", "new denials")}`;
  }
  if (counts.alreadyInQueue > 0) {
    return `${prefix}: no new denials`;
  }
  return `${prefix}: no denials`;
}

function doneDetailText(counts: DoneCounts, uploadedAt: string): string {
  const parts = [uploadedAt, `${countOf(counts.claimsTotal, "claim", "claims")} read`];
  if (counts.alreadyInQueue > 0) {
    parts.push(`${counts.alreadyInQueue} already in your queue`);
  }
  return parts.join(" · ");
}

// Turns one upload into the words the biller sees. Pure, so it is tested on its own.
export function describeUpload(remittance: RemittanceRow, timezone: string): UploadRowView {
  const uploadedAt = formatTimestamp(remittance.createdAt, timezone);
  const baseRow = {
    id: remittance.id,
    fileName: remittance.originalFilename,
    sourceLabel: remittance.source === "EOB" ? ("PDF" as const) : ("835" as const),
    errorId: null,
    detailIsError: false,
    isInProgress: false,
    canRetry: false,
    showQueueLink: false,
  };

  if (remittance.status === "queued" || remittance.status === "processing") {
    const statusText = remittance.status === "queued" ? "Queued" : "Processing";
    return {
      ...baseRow,
      tone: "working",
      statusText,
      detailText: `Uploaded ${uploadedAt}`,
      isInProgress: true,
    };
  }

  if (remittance.status === "failed") {
    return {
      ...baseRow,
      tone: "failed",
      statusText: "Failed",
      detailText: remittance.billerMessage ?? "Processing failed. Try again.",
      detailIsError: true,
      errorId: remittance.errorId,
      // A file the biller has to replace (an 837, say) would only fail again, so no retry.
      canRetry: remittance.errorId !== null,
    };
  }

  const counts = doneCounts(remittance);
  if (remittance.status === "done_with_warnings") {
    return {
      ...baseRow,
      tone: "attention",
      statusText: doneStatusText(counts, "Done with warnings"),
      detailText: remittance.billerMessage ?? doneDetailText(counts, uploadedAt),
      showQueueLink: counts.denialsCreated > 0,
    };
  }

  const hasNoDenials = counts.denialsCreated === 0 && counts.alreadyInQueue === 0;
  let detailText = doneDetailText(counts, uploadedAt);
  if (hasNoDenials && remittance.billerMessage !== null) {
    detailText = `${uploadedAt} · ${remittance.billerMessage}`;
  }
  return {
    ...baseRow,
    tone: "done",
    statusText: doneStatusText(counts, "Done"),
    detailText,
    showQueueLink: counts.denialsCreated > 0,
  };
}

export async function loadUploadPageView(biller: SignedInBiller): Promise<UploadPageView> {
  const remittances = await listRecentRemittances(db, biller.user.organizationId);
  const rows: UploadRowView[] = [];
  let anyInProgress = false;
  for (const remittance of remittances) {
    const row = describeUpload(remittance, biller.user.timezone);
    if (row.isInProgress) {
      anyInProgress = true;
    }
    rows.push(row);
  }
  return { rows, anyInProgress };
}
