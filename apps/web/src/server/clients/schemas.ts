import { z } from "zod";
import { ClientInterest, ClientNoteKind } from "@stackzio/db";

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined));

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email()
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

export const contactSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(80),
  role: optionalString(80),
  email: optionalEmail,
  phone: optionalString(40),
});

export const upsertClientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  company: optionalString(120),
  email: optionalEmail,
  phone: optionalString(40),
  website: optionalUrl,
  addressLine1: optionalString(160),
  addressLine2: optionalString(160),
  city: optionalString(80),
  state: optionalString(80),
  country: optionalString(80),
  postalCode: optionalString(20),
  notes: optionalString(2000),
  interestStatus: z.nativeEnum(ClientInterest).default(ClientInterest.NEW),
  followUpAt: z.coerce.date().nullable().optional(),
  followUpReason: optionalString(200),
  contacts: z.array(contactSchema).max(20).default([]),
});

export type UpsertClientInput = z.infer<typeof upsertClientSchema>;

export const addClientNoteSchema = z.object({
  clientId: z.string().min(1),
  body: z.string().trim().min(1, "Note required").max(4000),
  kind: z.nativeEnum(ClientNoteKind).default(ClientNoteKind.NOTE),
});

export type AddClientNoteInput = z.infer<typeof addClientNoteSchema>;

export const updateClientNoteSchema = z.object({
  id: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
  kind: z.nativeEnum(ClientNoteKind),
});

export type UpdateClientNoteInput = z.infer<typeof updateClientNoteSchema>;

export const deleteClientNoteSchema = z.object({ id: z.string().min(1) });

export const updateClientInterestSchema = z.object({
  clientId: z.string().min(1),
  interestStatus: z.nativeEnum(ClientInterest),
});

export const updateClientFollowUpSchema = z.object({
  clientId: z.string().min(1),
  followUpAt: z.coerce.date().nullable(),
  followUpReason: optionalString(200),
});
