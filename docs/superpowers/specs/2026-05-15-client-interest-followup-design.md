# Client Interest, Follow-Up & Discussion Notes — Design

**Date:** 2026-05-15
**Status:** Draft — awaiting approval
**Scope:** `apps/web` clients module + `packages/db` schema

## Problem

The `Client` model has a single `notes` text field. Sales/account owners cannot:

1. Track whether a client is interested, cold, or already converted.
2. Schedule and surface follow-ups (when to chase next, and why).
3. Log an ongoing conversation history (who said what, when, and via which channel).

Result: deals fall through cracks; team members re-ask the same questions; nobody knows which clients are due for outreach.

## Goals

- Capture **interest stage** as a single source of truth on each client.
- Make **follow-ups visible** on the list and detail page (overdue gets flagged).
- Replace the single static notes blob with a **timestamped, attributable discussion log** that supports multiple channels (call, email, meeting, WhatsApp, generic note).
- Keep the existing `Client.notes` field as a stable **profile/background note** — separate concern from active discussion.

## Non-Goals

- Email integration / IMAP sync.
- Reminder notifications/cron — follow-up surfacing is purely on-screen for v1.
- File attachments on notes.
- Mentions / threading on notes.
- Audit trail of status changes (a single `interestStatus` field is enough; no history table).

## Data Model Changes

### New enums (`packages/db/prisma/schema.prisma`)

```prisma
enum ClientInterest {
  NEW
  INTERESTED
  FOLLOW_UP
  NEGOTIATING
  NOT_INTERESTED
  CONVERTED
  LOST
}

enum ClientNoteKind {
  NOTE
  CALL
  EMAIL
  MEETING
  WHATSAPP
}
```

### `Client` model — add three columns

```prisma
model Client {
  // …existing fields…
  interestStatus  ClientInterest @default(NEW)
  followUpAt      DateTime?
  followUpReason  String?
  // …existing fields…
  discussionNotes ClientNote[]

  @@index([organizationId, interestStatus])
  @@index([organizationId, followUpAt])
}
```

### New `ClientNote` model

```prisma
model ClientNote {
  id        String         @id @default(cuid())
  clientId  String
  authorId  String
  body      String         // plain text, max 4000 chars (Zod-enforced)
  kind      ClientNoteKind @default(NOTE)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
  author User   @relation("ClientNoteAuthor", fields: [authorId], references: [id])

  @@index([clientId, createdAt])
}
```

### Migration

- Single Prisma migration: `add_client_interest_followup_and_notes`.
- New columns are nullable / have defaults — no data backfill required.
- Existing `Client.notes` field is **untouched** (kept as static profile note).

## Server Layer

### `apps/web/src/server/clients/schemas.ts`

Extend `upsertClientSchema`:

```ts
interestStatus: z.nativeEnum(ClientInterest).default("NEW"),
followUpAt: z.coerce.date().optional().nullable(),
followUpReason: optionalString(200),
```

New schemas:

```ts
export const addClientNoteSchema = z.object({
  clientId: z.string().min(1),
  body: z.string().trim().min(1, "Note required").max(4000),
  kind: z.nativeEnum(ClientNoteKind).default("NOTE"),
});

export const updateClientNoteSchema = z.object({
  id: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
  kind: z.nativeEnum(ClientNoteKind),
});

export const deleteClientNoteSchema = z.object({ id: z.string().min(1) });
```

### `apps/web/src/server/clients/actions.ts`

New Server Actions (all org-scoped via `requireOrg`, all call `revalidatePath`):

- `addClientNote(input)` — author = current user; revalidates `/clients/[id]`.
- `updateClientNote(input)` — only author or org ADMIN/OWNER may edit.
- `deleteClientNote(input)` — only author or org ADMIN/OWNER may delete.
- `updateClientFollowUp(clientId, followUpAt, followUpReason)` — convenience for inline edits from detail page.
- `markFollowUpDone(clientId)` — sets `followUpAt = null`, `followUpReason = null`, and appends a `ClientNote { kind: NOTE, body: "Follow-up completed" }`.
- `updateClientInterest(clientId, interestStatus)` — convenience for inline status dropdown; revalidates list + detail.

`upsertClient` already exists — extend its Zod input + Prisma payload to cover the three new `Client` fields.

### `apps/web/src/server/clients/queries.ts`

- `getClient(id)` — include `discussionNotes: { take: 50, orderBy: { createdAt: "desc" }, include: { author: { select: { id: true, name: true, image: true } } } }`.
- `listClients(params)` — extend params with `status?: ClientInterest`, `dueWithin?: "overdue" | "week"`, and add corresponding `where` clauses. Return `interestStatus` and `followUpAt` in row shape.
- New `countClientsByStatus(orgId)` for the list-page filter chip counts.

## UI

### List page (`/clients/page.tsx` + `_components/clients-table.tsx`)

- New columns:
  - **Status** — colored Badge (one color per `ClientInterest` value, defined in `features/clients/constants.ts`).
  - **Follow-up** — relative date (`in 2 days`, `Today`, `2d overdue`); overdue rows get a destructive-tinted Badge.
- New filter chips above the table: status pills (`All` · `New` · `Interested` · `Follow-up` · `Negotiating` · `Won` · `Lost`) + a `Due this week` toggle.
- Sortable by `followUpAt` (nulls last).

### Detail page (`/clients/[id]/page.tsx`)

Restructure right column:

1. **Status row** — interest Badge + inline dropdown (admin-or-creator can change).
2. **Follow-up card** (above Projects):
   - Empty state: "No follow-up scheduled" + button "Schedule follow-up" → opens dialog (date picker + reason text).
   - Scheduled state: date (formatted + relative), reason, two buttons: "Mark done" (destructive-outline) and "Reschedule" (outline). Overdue gets a red banner.
3. **Discussion** card (replaces single-Notes block, sits above Projects):
   - Composer at top: textarea + kind dropdown (NOTE/CALL/EMAIL/MEETING/WHATSAPP) + "Add note" button.
   - Reverse-chronological timeline: avatar, author name, kind badge, relative time, body (whitespace-pre-wrap). Hover reveals edit/delete for own notes (or for ADMIN/OWNER).
4. **Background notes** card (only if `client.notes` not empty) — kept as a static read-only block, retitled "Background".

### Edit form (`_components/client-form.tsx`)

Add a new "Sales" section before "Notes":

- Interest status — `<Select>` (default `NEW`).
- Next follow-up — `<DatePicker>` (optional).
- Follow-up reason — `<Input>` (optional, only shown when date set).

The existing "Notes" textarea stays, retitled "Background notes" with helper text "For ongoing conversation, use the Discussion tab on the client page."

### New components

```
features/clients/
  components/
    interest-badge.tsx           # colored badge for ClientInterest
    interest-select.tsx          # inline status dropdown (server-action wired)
    follow-up-card.tsx           # full card UI
    follow-up-dialog.tsx         # schedule/reschedule modal (date + reason)
    discussion-timeline.tsx      # list of ClientNote
    discussion-composer.tsx      # textarea + kind selector + submit
    discussion-note-item.tsx     # one note row, with edit/delete menu
  hooks/
    use-add-client-note.ts       # mutation wrapper
    use-update-follow-up.ts
    use-update-client-interest.ts
  constants.ts                   # INTEREST_LABELS, INTEREST_COLORS, NOTE_KIND_LABELS, NOTE_KIND_ICONS
```

## Authorization

- All reads/writes scoped to current org (existing `requireOrg` pattern).
- Edit/delete a `ClientNote`: allowed if `userId === note.authorId` OR caller is `OWNER` / `ADMIN`. Otherwise throw.
- Status / follow-up changes: any org member can change (matches existing `upsertClient` permission).
- `DeleteClientButton` rule unchanged (admin only, not allowed when projects exist).

## Constants (`features/clients/constants.ts`)

```ts
export const INTEREST_LABELS: Record<ClientInterest, string> = {
  NEW: "New",
  INTERESTED: "Interested",
  FOLLOW_UP: "Follow-up",
  NEGOTIATING: "Negotiating",
  NOT_INTERESTED: "Not interested",
  CONVERTED: "Converted",
  LOST: "Lost",
};

export const INTEREST_BADGE: Record<ClientInterest, BadgeVariant> = {
  NEW: "secondary",
  INTERESTED: "default",
  FOLLOW_UP: "warning",
  NEGOTIATING: "default",
  NOT_INTERESTED: "outline",
  CONVERTED: "success",
  LOST: "destructive",
};

export const NOTE_KIND_LABELS: Record<ClientNoteKind, string> = {
  NOTE: "Note",
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  WHATSAPP: "WhatsApp",
};

export const NOTE_KIND_ICONS: Record<ClientNoteKind, LucideIcon> = {
  NOTE: StickyNote,
  CALL: PhoneCall,
  EMAIL: Mail,
  MEETING: Users,
  WHATSAPP: MessageCircle,
};
```

## Tests

- `apps/web/src/server/clients/schemas.test.ts` — extend with cases for new fields, new note schemas, max length, enum validation.
- New `apps/web/src/server/clients/actions.test.ts` — covers add/update/delete note authorization, follow-up update, status update, org-scoping.
- Playwright e2e (`apps/web/e2e/clients.spec.ts` if present, else new): create client → set interest → add 2 notes (CALL + EMAIL) → schedule follow-up → mark done → verify timeline shows the auto-appended "Follow-up completed" entry.

## Edge Cases

- Status change to `CONVERTED` is **manual only** in v1 — not auto-triggered by project creation. (Avoids surprising state changes; can be revisited.)
- `followUpAt` in the past is allowed (user may want to log a missed one). UI flags it as overdue but doesn't block save.
- Deleting a client cascades `ClientNote` rows (via `onDelete: Cascade`).
- Notes are **plain text**, no markdown rendering — `whitespace-pre-wrap` preserves line breaks. Keeps XSS surface minimal.
- Editing a note bumps `updatedAt` only; UI shows "edited" suffix when `updatedAt > createdAt + 5s`.
- `getClient` caps notes at 50 most recent. v1 has no pagination — listed as a known limitation; if hit, add cursor pagination later.

## Rollout

1. Schema migration → `pnpm db:push` then commit migration file.
2. Server schemas + actions + queries.
3. Constants + new feature components.
4. Wire into list page (columns + filters), detail page (cards + composer), edit form (Sales section).
5. Tests (unit + e2e).
6. Browser walkthrough across `OWNER`, `ADMIN`, and `MEMBER` roles.

## Open Questions

None — all defaults specified above. If user later wants auto-status-on-conversion, attachments, or notifications, they're additive and don't require schema rework.
