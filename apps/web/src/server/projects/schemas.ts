import { z } from "zod";

export const PROJECT_CATEGORY = ["SHOPIFY", "WEBSITE", "SOFTWARE", "MOBILE_APP", "BRANDING", "MARKETING", "OTHER"] as const;
export const PROJECT_STATUS = ["LEAD", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined));

const decimalString = z
  .union([z.string(), z.number()])
  .transform((v) => Number(v))
  .refine((n) => Number.isFinite(n) && n >= 0, "Must be ≥ 0");

const optionalDate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? new Date(v) : undefined));

export const upsertProjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  description: optionalString(2000),
  clientId: z.string().min(1, "Client is required"),
  ownerId: z.string().min(1, "Owner is required"),
  category: z.enum(PROJECT_CATEGORY),
  status: z.enum(PROJECT_STATUS),
  priceTotal: decimalString,
  currency: z.string().trim().length(3).toUpperCase(),
  startDate: optionalDate,
  deadline: optionalDate,
  progressPct: z
    .union([z.string(), z.number()])
    .transform((v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)))),
  memberIds: z.array(z.string()).default([]),
});

export type UpsertProjectInput = z.input<typeof upsertProjectSchema>;

export const upsertTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: optionalString(1000),
  assigneeId: z.string().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  status: z.enum(["TODO", "DOING", "DONE"]).default("TODO"),
  dueDate: optionalDate,
});
export type UpsertTaskInput = z.input<typeof upsertTaskSchema>;
