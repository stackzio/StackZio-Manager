import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

export function formatDate(input: Date | string | null | undefined, pattern = "dd MMM yyyy"): string {
  if (!input) return "—";
  const d = typeof input === "string" ? parseISO(input) : input;
  if (!isValid(d)) return "—";
  return format(d, pattern);
}

export function formatDateTime(input: Date | string | null | undefined): string {
  return formatDate(input, "dd MMM yyyy, h:mm a");
}

export function timeAgo(input: Date | string | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? parseISO(input) : input;
  if (!isValid(d)) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}
