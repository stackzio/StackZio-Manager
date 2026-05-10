import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns";

export type PeriodPreset =
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "this_year"
  | "custom";

export interface PeriodRange {
  from: Date; // UTC
  to: Date;   // UTC, inclusive
}

export function periodRange(
  preset: PeriodPreset,
  timezone: string,
  now: Date = new Date(),
  custom?: { from: Date; to: Date },
): PeriodRange {
  if (preset === "custom") {
    if (!custom) throw new Error("custom range requires from/to");
    return {
      from: fromZonedTime(startOfDay(custom.from), timezone),
      to: fromZonedTime(endOfDay(custom.to), timezone),
    };
  }
  const local = toZonedTime(now, timezone);
  let fromLocal: Date;
  let toLocal: Date;
  switch (preset) {
    case "this_month":
      fromLocal = startOfMonth(local);
      toLocal = endOfMonth(local);
      break;
    case "last_month":
      fromLocal = startOfMonth(subMonths(local, 1));
      toLocal = endOfMonth(subMonths(local, 1));
      break;
    case "last_3_months":
      fromLocal = startOfMonth(subMonths(local, 2));
      toLocal = endOfMonth(local);
      break;
    case "this_year":
      fromLocal = startOfYear(local);
      toLocal = endOfYear(local);
      break;
  }
  return {
    from: fromZonedTime(fromLocal, timezone),
    to: fromZonedTime(toLocal, timezone),
  };
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
