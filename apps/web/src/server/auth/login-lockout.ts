import "server-only";

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 15;

const MILLISECONDS_PER_MINUTE = 60 * 1000;

export function lockoutWindowStart(now: Date): Date {
  return new Date(now.getTime() - LOCKOUT_MINUTES * MILLISECONDS_PER_MINUTE);
}

export function isLockedOut(recentFailedLogins: number): boolean {
  return recentFailedLogins >= MAX_FAILED_LOGINS;
}
