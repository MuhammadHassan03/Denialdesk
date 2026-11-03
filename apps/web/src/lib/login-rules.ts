// Rules the login and setup forms can show before submit, and the server enforces again.

export const MIN_PASSWORD_LENGTH = 12;

const DEFAULT_PATH_AFTER_LOGIN = "/queue";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isPasswordLongEnough(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

// Only same-site relative paths are allowed, so a crafted link can't send the biller elsewhere.
export function safePathAfterLogin(nextPath: string | null | undefined): string {
  if (nextPath === null || nextPath === undefined) {
    return DEFAULT_PATH_AFTER_LOGIN;
  }
  const startsWithOneSlash = nextPath.startsWith("/") && !nextPath.startsWith("//");
  if (!startsWithOneSlash || nextPath.includes("\\") || nextPath.startsWith("/login")) {
    return DEFAULT_PATH_AFTER_LOGIN;
  }
  return nextPath;
}
