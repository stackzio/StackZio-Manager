import { z } from "zod";
import { EXPENSE_METHODS } from "../schemas";

export const FREQUENCIES = ["MONTHLY", "YEARLY"] as const;

const moneyString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Use a positive number with up to 2 decimals");

export const upsertExpenseRuleSchema = z
  .object({
    categoryId: z.string().cuid(),
    vendor: z
      .string()
      .trim()
      .max(120)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    amount: moneyString,
    method: z.enum(EXPENSE_METHODS).default("BANK"),
    reference: z
      .string()
      .trim()
      .max(120)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    note: z
      .string()
      .trim()
      .max(500)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    frequency: z.enum(FREQUENCIES),
    dayOfMonth: z.coerce.number().int().min(1).max(31),
    monthOfYear: z.coerce.number().int().min(1).max(12).optional(),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endsOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    active: z.boolean().default(true),
  })
  .refine((v) => (v.frequency === "YEARLY" ? v.monthOfYear != null : true), {
    message: "Pick a month for yearly recurring",
    path: ["monthOfYear"],
  })
  .refine(
    (v) => {
      if (!v.endsOn) return true;
      return new Date(v.endsOn).getTime() >= new Date(v.startsOn).getTime();
    },
    {
      message: "End date must be on or after the start date",
      path: ["endsOn"],
    },
  );

export type UpsertExpenseRuleInput = z.input<typeof upsertExpenseRuleSchema>;
