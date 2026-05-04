import { z } from "zod";

export const MEETING_LOCATION = ["ONLINE", "CLIENT_LOCATION", "OUR_LOCATION"] as const;
export const MEETING_STATUS = ["SCHEDULED", "DONE", "CANCELLED"] as const;

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined));

const optionalUrl = z
  .string()
  .trim()
  .url()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

const optionalCuid = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

export const upsertMeetingSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  clientId: optionalCuid,
  projectId: optionalCuid,
  scheduledAt: z
    .string()
    .trim()
    .min(1, "Date and time are required")
    .transform((v) => new Date(v)),
  durationMin: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n) && n >= 5 && n <= 600, "Duration must be 5–600 minutes")
    .default(30),
  locationKind: z.enum(MEETING_LOCATION).default("ONLINE"),
  locationDetail: optionalString(200),
  meetingUrl: optionalUrl,
  agenda: optionalString(2000),
  remarks: optionalString(2000),
  status: z.enum(MEETING_STATUS).default("SCHEDULED"),
  attendeeIds: z.array(z.string()).default([]),
});

export type UpsertMeetingInput = z.input<typeof upsertMeetingSchema>;
