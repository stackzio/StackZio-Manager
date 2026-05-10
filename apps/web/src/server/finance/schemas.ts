import { z } from "zod";

export const EXPENSE_METHODS = ["BANK", "CASH", "UPI", "CARD", "OTHER"] as const;
export const PAYOUT_METHODS = ["BANK", "CASH", "UPI", "CARD", "OTHER"] as const;
export const PAYOUT_KINDS = ["SALARY", "PROJECT", "BONUS"] as const;
export const PERIOD_PRESETS = ["this_month", "last_month", "last_3_months", "this_year", "custom"] as const;

const moneyString = z.string().regex(/^\d+(\.\d{1,2})?$/, "Use a positive number with up to 2 decimals");

export const upsertExpenseSchema = z.object({
  categoryId: z.string().cuid(),
  vendor: z.string().trim().max(120).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  amount: moneyString,
  spentAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  method: z.enum(EXPENSE_METHODS).default("BANK"),
  reference: z.string().trim().max(120).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  note: z.string().trim().max(500).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  receiptUrl: z.string().url().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
});
export type UpsertExpenseInput = z.input<typeof upsertExpenseSchema>;

export const upsertPayoutSchema = z
  .object({
    memberUserId: z.string().cuid(),
    kind: z.enum(PAYOUT_KINDS),
    amount: moneyString,
    projectId: z.string().cuid().optional(),
    periodMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(), // YYYY-MM
    paidAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    method: z.enum(PAYOUT_METHODS).default("BANK"),
    reference: z.string().trim().max(120).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
    note: z.string().trim().max(500).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  })
  .refine((v) => (v.kind === "PROJECT" ? !!v.projectId : !v.projectId), {
    message: "Project is required for PROJECT payouts and forbidden otherwise",
    path: ["projectId"],
  })
  .refine((v) => (v.kind === "SALARY" ? !!v.periodMonth : !v.periodMonth), {
    message: "periodMonth is required for SALARY payouts and forbidden otherwise",
    path: ["periodMonth"],
  });
export type UpsertPayoutInput = z.input<typeof upsertPayoutSchema>;

export const upsertCategorySchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().trim().min(1).max(40),
});
export type UpsertCategoryInput = z.input<typeof upsertCategorySchema>;

export const periodQuerySchema = z.object({
  preset: z.enum(PERIOD_PRESETS).default("this_month"),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type PeriodQuery = z.input<typeof periodQuerySchema>;
