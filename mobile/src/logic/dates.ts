/**
 * Calendar-date helpers (YYYY-MM-DD, local time). Days left is always derived
 * from expiresAt so the "Skip ahead a day" demo button only has to bump an offset.
 *
 * TODO(ios-logic): owned by the data-model teammate; keep the signatures stable.
 */
const DAY_MS = 86_400_000;

function pad(n: number) {
  if (n < 10) {
    return `0${n}`;
  }
  return String(n);
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Today's calendar date shifted by dayOffset (used by the demo "Skip ahead a day"). */
export function todayISO(dayOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return toISODate(d);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Whole days from `fromISO` to `toISO` (negative if `toISO` is in the past). */
export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((parseISODate(toISO).getTime() - parseISODate(fromISO).getTime()) / DAY_MS);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Nov 4" for tombstones and memorial dates. */
export function formatShort(iso: string): string {
  const d = parseISODate(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
