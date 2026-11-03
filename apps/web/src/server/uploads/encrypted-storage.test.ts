import { createDecipheriv, randomBytes } from "node:crypto";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { deleteStoredFile, sha256Hex, storeEncryptedFile } from "./encrypted-storage";

const NONCE_BYTES = 12;
const TAG_BYTES = 16;

describe("encrypted storage", () => {
  it("writes ciphertext that decrypts back to the upload", async () => {
    const storageDir = await mkdtemp(path.join(tmpdir(), "denialdesk-storage-"));
    const encryptionKey = randomBytes(32);
    const fileBytes = Buffer.from("ISA*00*synthetic 835 contents~");

    const storageUri = await storeEncryptedFile(fileBytes, {
      storageDir,
      encryptionKeyBase64: encryptionKey.toString("base64"),
    });

    const storedBytes = await readFile(path.join(storageDir, storageUri.replace("local:", "")));
    expect(storedBytes.includes(fileBytes)).toBe(false);
    const nonce = storedBytes.subarray(0, NONCE_BYTES);
    const tag = storedBytes.subarray(storedBytes.length - TAG_BYTES);
    const ciphertext = storedBytes.subarray(NONCE_BYTES, storedBytes.length - TAG_BYTES);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey, nonce);
    decipher.setAuthTag(tag);
    const decryptedBytes = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    expect(decryptedBytes.equals(fileBytes)).toBe(true);
  });

  it("deletes a stored file", async () => {
    const storageDir = await mkdtemp(path.join(tmpdir(), "denialdesk-storage-"));
    const settings = { storageDir, encryptionKeyBase64: randomBytes(32).toString("base64") };
    const storageUri = await storeEncryptedFile(Buffer.from("synthetic"), settings);

    await deleteStoredFile(storageUri, settings);

    expect(await readdir(storageDir)).toEqual([]);
  });

  it("hashes file bytes as hex SHA-256", () => {
    expect(sha256Hex(Buffer.from("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
