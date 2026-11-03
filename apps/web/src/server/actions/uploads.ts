"use server";

import { z } from "zod";
import { formatIsoDate, todayInTimezone } from "@/lib/dates";
import { checkUploadFile } from "@/lib/upload-files";
import { requireSession } from "../auth/session";
import { db } from "../db/client";
import { insertAuditEvent } from "../db/queries/audit-events";
import { queueProcessRemittanceJob } from "../db/queries/jobs";
import {
  findRemittanceByHash,
  findRemittanceById,
  insertRemittance,
  markRemittanceQueued,
} from "../db/queries/remittances";
import { readServerEnv } from "../env";
import { logServerError, newErrorId } from "../errors";
import { deleteStoredFile, sha256Hex, storeEncryptedFile } from "../uploads/encrypted-storage";

// One file per call, so each file gets its own progress bar and result (F2).
export type UploadFileResult =
  | { outcome: "queued"; remittanceId: string }
  | { outcome: "duplicate"; existingRemittanceId: string; billerMessage: string }
  | { outcome: "rejected"; billerMessage: string }
  | { outcome: "failed"; billerMessage: string; errorId: string };

export type RetryProcessingResult =
  { outcome: "queued" } | { outcome: "rejected"; billerMessage: string };

const UPLOAD_FAILED_MESSAGE = "Upload failed. Nothing was saved. Try again.";
const PDF_EXTENSION = ".pdf";

function remittanceSourceFor(fileName: string): "835" | "EOB" {
  if (fileName.toLowerCase().endsWith(PDF_EXTENSION)) {
    return "EOB";
  }
  return "835";
}

export async function uploadRemittanceFile(formData: FormData): Promise<UploadFileResult> {
  const biller = await requireSession();
  const uploadedFile = formData.get("file");
  if (!(uploadedFile instanceof File)) {
    return { outcome: "rejected", billerMessage: "Pick a file to upload." };
  }

  const fileCheck = checkUploadFile(uploadedFile.name, uploadedFile.size);
  if (!fileCheck.accepted) {
    return { outcome: "rejected", billerMessage: fileCheck.billerMessage };
  }

  const organizationId = biller.user.organizationId;
  const fileBytes = Buffer.from(await uploadedFile.arrayBuffer());
  const fileHash = sha256Hex(fileBytes);
  const existingRemittance = await findRemittanceByHash(db, organizationId, fileHash);
  if (existingRemittance !== null) {
    const uploadedOn = formatIsoDate(
      todayInTimezone(existingRemittance.createdAt, biller.user.timezone),
    );
    return {
      outcome: "duplicate",
      existingRemittanceId: existingRemittance.id,
      billerMessage: `Already uploaded on ${uploadedOn}.`,
    };
  }

  const env = readServerEnv();
  const storageSettings = {
    storageDir: env.STORAGE_DIR,
    encryptionKeyBase64: env.FILE_ENCRYPTION_KEY,
  };
  let storageUri: string | null = null;
  try {
    storageUri = await storeEncryptedFile(fileBytes, storageSettings);
    const savedStorageUri = storageUri;
    const remittanceId = await db.transaction(async (transaction) => {
      const newRemittanceId = await insertRemittance(transaction, {
        organizationId,
        uploadedByUserId: biller.user.id,
        source: remittanceSourceFor(uploadedFile.name),
        sha256: fileHash,
        originalFilename: uploadedFile.name,
        storageUri: savedStorageUri,
      });
      await queueProcessRemittanceJob(transaction, newRemittanceId);
      await insertAuditEvent(transaction, {
        organizationId,
        userId: biller.user.id,
        action: "upload",
        remittanceId: newRemittanceId,
        details: { source: remittanceSourceFor(uploadedFile.name), sizeBytes: uploadedFile.size },
      });
      return newRemittanceId;
    });
    return { outcome: "queued", remittanceId };
  } catch (error) {
    // No Remittance row may be left without its file, or a file without its row.
    if (storageUri !== null) {
      await deleteStoredFile(storageUri, storageSettings);
    }
    const errorId = newErrorId();
    logServerError("upload_failed", errorId, { userId: biller.user.id }, error);
    return { outcome: "failed", billerMessage: UPLOAD_FAILED_MESSAGE, errorId };
  }
}

const retryFormSchema = z.object({ remittanceId: z.string().uuid() });

// "Try again" on an upload whose processing failed: queue a fresh job for the same file.
export async function retryRemittanceProcessing(
  formData: FormData,
): Promise<RetryProcessingResult> {
  const biller = await requireSession();
  const parsedForm = retryFormSchema.safeParse({ remittanceId: formData.get("remittanceId") });
  if (!parsedForm.success) {
    return { outcome: "rejected", billerMessage: "We couldn't find that upload." };
  }

  const remittance = await findRemittanceById(
    db,
    biller.user.organizationId,
    parsedForm.data.remittanceId,
  );
  if (remittance === null) {
    return { outcome: "rejected", billerMessage: "We couldn't find that upload." };
  }
  if (remittance.status !== "failed") {
    return { outcome: "rejected", billerMessage: "This upload is not in a failed state." };
  }

  await db.transaction(async (transaction) => {
    await markRemittanceQueued(transaction, remittance.id);
    await queueProcessRemittanceJob(transaction, remittance.id);
  });
  return { outcome: "queued" };
}
