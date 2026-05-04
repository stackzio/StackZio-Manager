export type Currency = "INR" | "USD" | "EUR" | "GBP" | "AED" | "AUD" | "CAD" | "SGD";

const SYMBOL: Record<Currency, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "د.إ",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
};

const LOCALE: Record<Currency, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
  AED: "en-AE",
  AUD: "en-AU",
  CAD: "en-CA",
  SGD: "en-SG",
};

export function formatMoney(
  amount: number | string,
  currency: Currency = "INR",
  options: { compact?: boolean; withSymbol?: boolean } = {},
): string {
  const num = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(num)) return "—";
  const { compact = false, withSymbol = true } = options;
  const formatter = new Intl.NumberFormat(LOCALE[currency], {
    style: withSymbol ? "currency" : "decimal",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: 2,
  });
  return formatter.format(num);
}

export function currencySymbol(currency: Currency): string {
  return SYMBOL[currency];
}

export function sumPayments(payments: Array<{ amount: number | string }>): number {
  return payments.reduce((acc, p) => acc + Number(p.amount), 0);
}

export function outstanding(priceTotal: number | string, paidAmount: number): number {
  const total = Number(priceTotal);
  return Math.max(0, total - paidAmount);
}

export function paidPct(priceTotal: number | string, paidAmount: number): number {
  const total = Number(priceTotal);
  if (total <= 0) return 0;
  return Math.min(100, Math.round((paidAmount / total) * 100));
}
