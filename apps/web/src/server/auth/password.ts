import "server-only";
import { argon2, randomBytes, timingSafeEqual } from "node:crypto";

// OWASP's recommended argon2id settings: 19 MiB memory, 2 passes, 1 lane.
const ARGON2_MEMORY_KIB = 19456;
const ARGON2_PASSES = 2;
const ARGON2_PARALLELISM = 1;
const ARGON2_TAG_BYTES = 32;
const SALT_BYTES = 16;
const ARGON2_VERSION = 19;

type Argon2Settings = {
  memoryKib: number;
  passes: number;
  parallelism: number;
};

function deriveKey(password: string, salt: Buffer, settings: Argon2Settings): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    argon2(
      "argon2id",
      {
        message: password,
        nonce: salt,
        memory: settings.memoryKib,
        passes: settings.passes,
        parallelism: settings.parallelism,
        tagLength: ARGON2_TAG_BYTES,
      },
      (error, derivedKey) => {
        if (error !== null) {
          reject(error);
          return;
        }
        resolve(derivedKey);
      },
    );
  });
}

// Stored in the standard PHC form: $argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const settings = {
    memoryKib: ARGON2_MEMORY_KIB,
    passes: ARGON2_PASSES,
    parallelism: ARGON2_PARALLELISM,
  };
  const derivedKey = await deriveKey(password, salt, settings);
  const settingsText = `m=${settings.memoryKib},t=${settings.passes},p=${settings.parallelism}`;
  return `$argon2id$v=${ARGON2_VERSION}$${settingsText}$${salt.toString("base64")}$${derivedKey.toString("base64")}`;
}

function readSettings(settingsText: string): Argon2Settings | null {
  const values = new Map<string, number>();
  for (const pair of settingsText.split(",")) {
    const [name, valueText] = pair.split("=");
    if (name === undefined || valueText === undefined) {
      return null;
    }
    values.set(name, Number(valueText));
  }
  const memoryKib = values.get("m");
  const passes = values.get("t");
  const parallelism = values.get("p");
  if (memoryKib === undefined || passes === undefined || parallelism === undefined) {
    return null;
  }
  return { memoryKib, passes, parallelism };
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split("$");
  if (parts.length !== 6 || parts[1] !== "argon2id") {
    return false;
  }
  const settingsText = parts[3] ?? "";
  const saltText = parts[4] ?? "";
  const hashText = parts[5] ?? "";
  const settings = readSettings(settingsText);
  if (settings === null) {
    return false;
  }
  const expectedKey = Buffer.from(hashText, "base64");
  const derivedKey = await deriveKey(password, Buffer.from(saltText, "base64"), settings);
  if (derivedKey.length !== expectedKey.length) {
    return false;
  }
  return timingSafeEqual(derivedKey, expectedKey);
}
