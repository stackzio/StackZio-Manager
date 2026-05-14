/**
 * Pure date math for recurring expense rules.
 *
 * Kept separate from materialize.ts so unit tests can import these helpers
 * without pulling Prisma / Next.js / next-auth into their loader graph.
 */

/** Days in the given month, considering leap years for February. */
export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

/**
 * Resolve the actual day for a target (year, month) given a wanted day.
 * If wanted=31 and month=Feb, returns 28 (or 29 on leap year).
 */
export function clampedDay(year: number, monthIndex0: number, wantedDay: number): number {
  const cap = daysInMonth(year, monthIndex0);
  return Math.min(Math.max(1, wantedDay), cap);
}

export interface CadenceInput {
  frequency: "MONTHLY" | "YEARLY";
  dayOfMonth: number;
  monthOfYear: number | null;
}

/**
 * Compute the first eligible run date >= `from` for a rule.
 * For MONTHLY: the next occurrence of `dayOfMonth` (clamped).
 * For YEARLY: the next occurrence of (`monthOfYear`, `dayOfMonth`).
 *
 * All dates are computed and returned in UTC.
 */
export function computeNextRunAt(rule: CadenceInput, from: Date): Date {
  const y = from.getUTCFullYear();
  const m = from.getUTCMonth();

  if (rule.frequency === "MONTHLY") {
    const candidateDay = clampedDay(y, m, rule.dayOfMonth);
    const candidate = new Date(Date.UTC(y, m, candidateDay, 0, 0, 0, 0));
    if (candidate.getTime() >= from.getTime()) return candidate;
    // This month's slot already passed → next month
    const ny = m === 11 ? y + 1 : y;
    const nm = m === 11 ? 0 : m + 1;
    return new Date(Date.UTC(ny, nm, clampedDay(ny, nm, rule.dayOfMonth), 0, 0, 0, 0));
  }

  // YEARLY
  const targetMonth = (rule.monthOfYear ?? 1) - 1; // 0-based
  let candidate = new Date(
    Date.UTC(y, targetMonth, clampedDay(y, targetMonth, rule.dayOfMonth), 0, 0, 0, 0),
  );
  if (candidate.getTime() >= from.getTime()) return candidate;
  // This year's slot already passed → next year
  candidate = new Date(
    Date.UTC(y + 1, targetMonth, clampedDay(y + 1, targetMonth, rule.dayOfMonth), 0, 0, 0, 0),
  );
  return candidate;
}
