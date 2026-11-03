import "server-only";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// File layout, read back by the pipeline's intake/stored_file.py:
// 12-byte nonce, then AES-256-GCM ciphertext, then the 16-byte auth tag.
const NONCE_BYTES = 12;
const STORED_NAME_BYTES = 16;
const LOCAL_STORAGE_PREFIX = "local:";

export type StorageSettings = {
  storageDir: string;
  encryptionKeyBase64: string;
};

export function sha256Hex(fileBytes: Buffer): string {
  return createHash("sha256").update(fileBytes).digest("hex");
}

export function encryptFileBytes(fileBytes: Buffer, encryptionKey: Buffer): Buffer {
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, nonce);
  const ciphertext = Buffer.concat([cipher.update(fileBytes), cipher.final()]);
  return Buffer.concat([nonce, ciphertext, cipher.getAuthTag()]);
}

// Stored under a random name, so the file name never reveals anything about the claim.
export async function storeEncryptedFile(
  fileBytes: Buffer,
  settings: StorageSettings,
): Promise<string> {
  const storedName = randomBytes(STORED_NAME_BYTES).toString("hex");
  const encryptionKey = Buffer.from(settings.encryptionKeyBase64, "base64");
  await mkdir(settings.storageDir, { recursive: true });
  await writeFile(
    path.join(settings.storageDir, storedName),
    encryptFileBytes(fileBytes, encryptionKey),
  );
  return `${LOCAL_STORAGE_PREFIX}${storedName}`;
}

export async function deleteStoredFile(
  storageUri: string,
  settings: StorageSettings,
): Promise<void> {
  const storedName = storageUri.slice(LOCAL_STORAGE_PREFIX.length);
  await rm(path.join(settings.storageDir, storedName), { force: true });
}
