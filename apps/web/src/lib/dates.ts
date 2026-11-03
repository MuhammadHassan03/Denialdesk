// Deadlines are plain calendar dates (YYYY-MM-DD). We do the math in UTC so a
// biller's time zone can never shift a deadline by a day.

export const DEADLINE_WARNING_DAYS = 7;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const ISO_DATE_LENGTH = 10;

function parseIsoDate(isoDate: string): number {
  const parts = isoDate.split("-");
  if (isoDate.length !== ISO_DATE_LENGTH || parts.length !== 3) {
    throw new Error(`Expected a date like 2026-01-31, got "${isoDate}"`);
  }
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const timestamp = Date.UTC(year, month - 1, day);
  // Date.UTC quietly rolls 2026-02-30 over to March, so check the date survives a round trip.
  const isRealCalendarDate =
    !Number.isNaN(timestamp) && new Date(timestamp).toISOString().startsWith(isoDate);
  if (!isRealCalendarDate) {
    throw new Error(`Expected a date like 2026-01-31, got "${isoDate}"`);
  }
  return timestamp;
}

export function daysUntil(deadline: string, today: string): number {
  const deadlineTimestamp = parseIsoDate(deadline);
  const todayTimestamp = parseIsoDate(today);
  return Math.round((deadlineTimestamp - todayTimestamp) / MILLISECONDS_PER_DAY);
}

export function isDeadlineSoon(deadline: string, today: string): boolean {
  return daysUntil(deadline, today) <= DEADLINE_WARNING_DAYS;
}

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

// "2026-09-02" -> "Sep 2, 2026"
export function formatIsoDate(isoDate: string): string {
  return longDateFormatter.format(parseIsoDate(isoDate));
}

// "2026-11-07" -> "Nov 7"
export function formatMonthDay(isoDate: string): string {
  return monthDayFormatter.format(parseIsoDate(isoDate));
}

// "2026-11-04" plus 7 -> "2026-11-11". Negative counts go back in time.
export function addDays(isoDate: string, dayCount: number): string {
  const shifted = parseIsoDate(isoDate) + dayCount * MILLISECONDS_PER_DAY;
  return new Date(shifted).toISOString().slice(0, ISO_DATE_LENGTH);
}

// Today's calendar date where the biller works. "en-CA" writes dates as YYYY-MM-DD.
export function todayInTimezone(now: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now);
}

// A UTC timestamp shown in the biller's time zone: "Nov 4, 10:12 AM".
export function formatTimestamp(timestamp: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(timestamp);
}
