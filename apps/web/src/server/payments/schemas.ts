import { z } from "zod";

export const PAYMENT_KIND = ["ADVANCE", "MILESTONE", "FINAL"] as const;
export const PAYMENT_METHOD = ["CASH", "UPI", "BANK", "CARD", "OTHER"] as const;

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined));

export const upsertPaymentSchema = z.object({
  amount: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n) && n > 0, "Amount must be greater than 0"),
  kind: z.enum(PAYMENT_KIND).default("MILESTONE"),
  method: z.enum(PAYMENT_METHOD).default("BANK"),
  paidAt: z
    .string()
    .trim()
    .min(1, "Date is required")
    .transform((v) => new Date(v)),
  reference: optionalString(80),
  note: optionalString(500),
});

export type UpsertPaymentInput = z.input<typeof upsertPaymentSchema>;
