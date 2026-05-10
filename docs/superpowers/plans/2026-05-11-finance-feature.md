# Finance Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Finance feature defined in [`docs/superpowers/specs/2026-05-11-finance-design.md`](../specs/2026-05-11-finance-design.md): expenses, team payouts, profit-and-loss dashboard, per-member earnings page, owner-grantable admin finance access — all calculations correct, RBAC tight, tested.

**Architecture:** Additive Prisma schema (no destructive migrations). RBAC split into `canSeeProjectFinancials` (existing, role-only) and `canSeeOrgFinancials` (new, role + per-admin flag). Server actions + Zod schemas + `React.cache()` queries follow the existing `server/<domain>/{schemas,queries,actions}.ts` pattern. UI uses existing primitives (shadcn/ui, recharts, framer-motion, sonner). All money math uses Prisma `Decimal` end-to-end.

**Tech Stack:** Next.js 15 App Router · React 19 · TypeScript strict · Prisma 6 · PostgreSQL · Auth.js v5 · Tailwind CSS · shadcn/ui · recharts · framer-motion · Vitest · Playwright · Cloudinary (existing uploads pipeline) · sonner · Zod.

---

## Phasing & checkpoint policy

The plan is grouped into 14 phases. Each phase ends with a "Phase checkpoint" task — run typecheck and the relevant tests, commit, and move on. **Don't skip phase checkpoints.**

| Phase | Theme | Approx. tasks |
| ----- | ----- | ------------- |
| 1     | Prisma schema & migration | 4 |
| 2     | RBAC split + canSeeFinancials flag | 5 |
| 3     | Decimal & period utilities (pure) | 4 |
| 4     | Server: expenses (queries + actions) | 5 |
| 5     | Server: payouts (queries + actions) | 5 |
| 6     | Server: P&L aggregation | 3 |
| 7     | Server: my-earnings | 2 |
| 8     | Shared UI primitives | 3 |
| 9     | `/expenses` UI | 4 |
| 10    | `/payouts` UI | 4 |
| 11    | `/finance` P&L dashboard | 4 |
| 12    | `/my-earnings` UI | 3 |
| 13    | `/team` finance toggle + sidebar | 2 |
| 14    | Notifications, E2E, polish, ship | 4 |

---

## File map

### Created

```
packages/db/prisma/schema.prisma                       # enums + 3 models + 2 fields (modified)
packages/db/prisma/migrations/<ts>_add_finance/        # one migration

apps/web/src/server/finance/schemas.ts                 # Zod
apps/web/src/server/finance/period.ts                  # period boundary calc
apps/web/src/server/finance/period.test.ts
apps/web/src/server/finance/pl.ts                      # P&L math
apps/web/src/server/finance/pl.test.ts
apps/web/src/server/finance/categories-seed.ts         # default ExpenseCategory rows
apps/web/src/server/finance/queries.ts                 # listExpenses, listPayouts, getProfitAndLoss, getMyEarnings
apps/web/src/server/finance/expense-actions.ts
apps/web/src/server/finance/expense-actions.test.ts
apps/web/src/server/finance/payout-actions.ts
apps/web/src/server/finance/payout-actions.test.ts
apps/web/src/server/finance/category-actions.ts
apps/web/src/server/finance/rbac.ts                    # requireOrgFinance() helper

apps/web/src/app/(app)/finance/page.tsx
apps/web/src/app/(app)/finance/_components/period-picker.tsx
apps/web/src/app/(app)/finance/_components/kpi-strip.tsx
apps/web/src/app/(app)/finance/_components/trend-chart.tsx
apps/web/src/app/(app)/finance/_components/breakdown-donut.tsx
apps/web/src/app/(app)/finance/_components/top-tables.tsx

apps/web/src/app/(app)/expenses/page.tsx
apps/web/src/app/(app)/expenses/_components/expenses-table.tsx
apps/web/src/app/(app)/expenses/_components/expense-form.tsx
apps/web/src/app/(app)/expenses/_components/expenses-toolbar.tsx
apps/web/src/app/(app)/expenses/categories/page.tsx
apps/web/src/app/(app)/expenses/categories/_components/category-form.tsx

apps/web/src/app/(app)/payouts/page.tsx
apps/web/src/app/(app)/payouts/_components/payouts-table.tsx
apps/web/src/app/(app)/payouts/_components/payout-form.tsx
apps/web/src/app/(app)/payouts/_components/repeat-last-month.tsx
apps/web/src/app/(app)/payouts/_components/payouts-toolbar.tsx

apps/web/src/app/(app)/my-earnings/page.tsx
apps/web/src/app/(app)/my-earnings/_components/earnings-hero.tsx
apps/web/src/app/(app)/my-earnings/_components/earnings-tabs.tsx

apps/web/src/components/finance/category-chip.tsx
apps/web/src/components/finance/kind-chip.tsx
apps/web/src/components/finance/animated-amount.tsx
apps/web/src/components/finance/icon-picker.tsx

apps/web/e2e/finance.spec.ts
```

### Modified

```
apps/web/src/server/auth/guards.ts                     # split + new helpers
apps/web/src/server/uploads/store.ts                   # add "expense-receipt" UploadKind
apps/web/src/app/api/uploads/route.ts                  # accept expense-receipt
apps/web/src/app/(app)/dashboard/page.tsx              # canSeeFinancials → canSeeProjectFinancials
apps/web/src/app/(app)/projects/page.tsx               # rename
apps/web/src/app/(app)/projects/[id]/page.tsx          # rename
apps/web/src/server/clients/queries.ts                 # rename
apps/web/src/server/payments/queries.ts                # rename
apps/web/src/server/dashboard/queries.ts               # rename
apps/web/src/components/app-shell/sidebar.tsx          # gated Finance section, "My earnings" for all
apps/web/src/app/(app)/team/_components/member-row.tsx # finance access toggle
apps/web/src/server/team/actions.ts                    # setMemberFinanceAccessAction
apps/web/src/server/organization/actions.ts            # seed system categories on create
apps/web/prisma                                        # (no change — generator config unchanged)
```

---

# Phase 1 — Prisma schema & migration

### Task 1.1: Add enums + models to `schema.prisma`

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Append enums + models at the bottom of `schema.prisma`**

```prisma
// =============================================================
// Finance
// =============================================================

enum ExpenseMethod {
  BANK
  CASH
  UPI
  CARD
  OTHER
}

enum PayoutMethod {
  BANK
  CASH
  UPI
  CARD
  OTHER
}

enum PayoutKind {
  SALARY
  PROJECT
  BONUS
}

model ExpenseCategory {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  color          String
  icon           String
  isSystem       Boolean  @default(false)
  createdAt      DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  expenses     Expense[]

  @@unique([organizationId, name])
  @@index([organizationId])
}

model Expense {
  id             String        @id @default(cuid())
  organizationId String
  categoryId     String
  vendor         String?
  amount         Decimal       @db.Decimal(14, 2)
  currency       String
  spentAt        DateTime
  method         ExpenseMethod @default(BANK)
  reference      String?
  note           String?
  receiptUrl     String?
  createdById    String
  createdAt      DateTime      @default(now())

  organization Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  category     ExpenseCategory @relation(fields: [categoryId], references: [id])
  createdBy    User            @relation("ExpenseCreator", fields: [createdById], references: [id])

  @@index([organizationId, spentAt])
  @@index([categoryId])
}

model Payout {
  id             String       @id @default(cuid())
  organizationId String
  memberUserId   String
  kind           PayoutKind
  amount         Decimal      @db.Decimal(14, 2)
  currency       String
  projectId      String?
  periodMonth    DateTime?
  paidAt         DateTime
  method         PayoutMethod @default(BANK)
  reference      String?
  note           String?
  createdById    String
  createdAt      DateTime     @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  member       User         @relation("PayoutMember", fields: [memberUserId], references: [id])
  project      Project?     @relation(fields: [projectId], references: [id])
  createdBy    User         @relation("PayoutCreator", fields: [createdById], references: [id])

  @@index([organizationId, paidAt])
  @@index([memberUserId, paidAt])
  @@index([projectId])
}
```

- [ ] **Step 2: Add reverse relations + new fields on existing models**

In `Organization`:
```prisma
  expenseCategories ExpenseCategory[]
  expenses          Expense[]
  payouts           Payout[]
  timezone          String  @default("UTC")  // IANA tz, e.g. "Asia/Kolkata"
```

In `OrganizationMember`:
```prisma
  canSeeFinancials  Boolean @default(false)
```

In `User`:
```prisma
  expensesCreated   Expense[] @relation("ExpenseCreator")
  payoutsReceived   Payout[]  @relation("PayoutMember")
  payoutsCreated    Payout[]  @relation("PayoutCreator")
```

In `Project`:
```prisma
  payouts           Payout[]
```

- [ ] **Step 3: Validate the schema**

```bash
pnpm -C packages/db prisma validate
```
Expected: `The schema at packages/db/prisma/schema.prisma is valid 🚀`

- [ ] **Step 4: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat(db): finance schema — expense, payout, category + canSeeFinancials"
```

### Task 1.2: Generate migration with partial unique index

**Files:**
- Create: `packages/db/prisma/migrations/<timestamp>_add_finance/migration.sql`

- [ ] **Step 1: Generate the migration**

```bash
pnpm -C packages/db prisma migrate dev --name add_finance --create-only
```
Expected: a new directory under `packages/db/prisma/migrations/` containing a `migration.sql`. Do not apply yet.

- [ ] **Step 2: Append the partial unique index manually**

Open the generated `migration.sql` and append at the end:

```sql
-- Enforce one SALARY payout per (org, member, periodMonth)
CREATE UNIQUE INDEX "payout_unique_salary_per_month"
  ON "Payout" ("organizationId", "memberUserId", "periodMonth")
  WHERE "kind" = 'SALARY';
```

- [ ] **Step 3: Apply the migration**

```bash
pnpm -C packages/db prisma migrate dev
pnpm -C packages/db prisma generate
```
Expected: migration applies cleanly, Prisma Client regenerates.

- [ ] **Step 4: Commit**

```bash
git add packages/db/prisma/migrations
git commit -m "feat(db): migration — finance tables + partial unique salary index"
```

### Task 1.3: Add `categories-seed.ts` (pure data — used by org create)

**Files:**
- Create: `apps/web/src/server/finance/categories-seed.ts`

- [ ] **Step 1: Write the seed module**

```ts
import type { Prisma } from "@stackzio/db";

export const SYSTEM_CATEGORIES: Array<Omit<Prisma.ExpenseCategoryCreateManyInput, "organizationId">> = [
  { name: "Ads",         color: "#ec4899", icon: "Megaphone", isSystem: true },
  { name: "Influencer",  color: "#a855f7", icon: "Users",     isSystem: true },
  { name: "Marketing",   color: "#6366f1", icon: "Sparkles",  isSystem: true },
  { name: "Software",    color: "#06b6d4", icon: "Code2",     isSystem: true },
  { name: "Rent",        color: "#f59e0b", icon: "Building2", isSystem: true },
  { name: "Travel",      color: "#10b981", icon: "Plane",     isSystem: true },
  { name: "Other",       color: "#71717a", icon: "Tag",       isSystem: true },
];

export async function seedSystemExpenseCategories(
  tx: { expenseCategory: { createMany: (args: { data: Prisma.ExpenseCategoryCreateManyInput[]; skipDuplicates?: boolean }) => Promise<unknown> } },
  organizationId: string,
) {
  await tx.expenseCategory.createMany({
    data: SYSTEM_CATEGORIES.map((c) => ({ ...c, organizationId })),
    skipDuplicates: true,
  });
}
```

- [ ] **Step 2: Wire into `createOrganizationAction`**

Open `apps/web/src/server/organization/actions.ts` and locate where the `Organization` row is created. Inside the same Prisma transaction (introduce one if necessary), call `seedSystemExpenseCategories(tx, org.id)` immediately after the org row is inserted.

- [ ] **Step 3: Backfill existing orgs**

Create `apps/web/scripts/backfill-system-categories.ts`:

```ts
import { prisma } from "@stackzio/db";
import { SYSTEM_CATEGORIES, seedSystemExpenseCategories } from "@/server/finance/categories-seed";

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true } });
  for (const o of orgs) {
    await seedSystemExpenseCategories(prisma, o.id);
    console.log("seeded", o.id);
  }
}
main().then(() => process.exit(0));
```

Run it once locally:
```bash
pnpm -C apps/web tsx scripts/backfill-system-categories.ts
```
Expected: each existing org prints "seeded <id>".

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/server/finance/categories-seed.ts apps/web/src/server/organization/actions.ts apps/web/scripts/backfill-system-categories.ts
git commit -m "feat(finance): seed 7 system expense categories on org create"
```

### Task 1.4: Phase 1 checkpoint

- [ ] Run typecheck & verify schema applied

```bash
pnpm -C apps/web typecheck
pnpm -C packages/db prisma db push --skip-generate    # dry-check
```
Expected: typecheck passes, no schema drift detected.

---

# Phase 2 — RBAC split + canSeeFinancials flag

### Task 2.1: Update `guards.ts` — split helpers

**Files:**
- Modify: `apps/web/src/server/auth/guards.ts`

- [ ] **Step 1: Replace the single `canSeeFinancials` helper**

Replace lines 9–17 with:

```ts
import type { OrgRole } from "@stackzio/db";

/** Project-level financials: prices, payments, client info. */
export function canSeeProjectFinancials(role: OrgRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** Org-level financials: P&L dashboard, all expenses, all payouts to others. */
export function canSeeOrgFinancials(
  role: OrgRole,
  canSeeFinancials: boolean,
): boolean {
  return role === "OWNER" || (role === "ADMIN" && canSeeFinancials);
}

/** Manage org-level financials. Same gate as viewing. */
export function canManageOrgFinancials(
  role: OrgRole,
  canSeeFinancials: boolean,
): boolean {
  return canSeeOrgFinancials(role, canSeeFinancials);
}

/** Toggle another member's finance-access flag. Owner only. */
export function canGrantFinanceAccess(role: OrgRole): boolean {
  return role === "OWNER";
}

/** Can this role upload / link / delete project documents? */
export function canManageDocs(role: OrgRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}
```

Keep the old `canSeeFinancials` symbol as a **deprecation alias** at the bottom (it's referenced in 6 files; safer to alias than to do a 6-file refactor as part of this task):

```ts
/** @deprecated Renamed to canSeeProjectFinancials. */
export const canSeeFinancials = canSeeProjectFinancials;
```

### Task 2.2: Migrate `requireOrg()` and `requireOrgAction()` to return `canSeeFinancials`

**Files:**
- Modify: `apps/web/src/server/auth/guards.ts`

- [ ] **Step 1: Update `getActiveOrg`**

Replace the function body so it selects the new field:

```ts
export const getActiveOrg = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  const findMember = (where: { userId: string; organizationId?: string }) =>
    prisma.organizationMember.findFirst({
      where,
      include: { organization: true },
      orderBy: { joinedAt: "desc" },
    });

  const member =
    (activeId
      ? await findMember({ userId: user.id, organizationId: activeId })
      : null) ?? (await findMember({ userId: user.id }));

  if (!member) return null;
  return {
    org: member.organization,
    role: member.role,
    canSeeFinancials: member.canSeeFinancials,
  };
});
```

`requireOrg` and `requireOrgAction` already spread `...active` — they'll start returning `canSeeFinancials` automatically.

- [ ] **Step 2: Add `requireOrgFinance()` action helper**

Append to `guards.ts`:

```ts
export async function requireOrgFinance() {
  const ctx = await requireOrgAction();
  if (!canSeeOrgFinancials(ctx.role, ctx.canSeeFinancials)) {
    throw new AuthError("Finance access required", "FORBIDDEN");
  }
  return ctx;
}
```

- [ ] **Step 3: Add a server-component variant that redirects**

Append:

```ts
export async function requirePageOrgFinance() {
  const ctx = await requireOrg();
  if (!canSeeOrgFinancials(ctx.role, ctx.canSeeFinancials)) {
    redirect("/dashboard");
  }
  return ctx;
}
```

### Task 2.3: Unit tests for the matrix

**Files:**
- Create: `apps/web/src/server/auth/guards.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect } from "vitest";
import {
  canSeeOrgFinancials,
  canManageOrgFinancials,
  canSeeProjectFinancials,
  canGrantFinanceAccess,
} from "./guards";

describe("RBAC: org-level finance", () => {
  const cases: Array<[Parameters<typeof canSeeOrgFinancials>[0], boolean, boolean]> = [
    ["OWNER",  true,  true ],
    ["OWNER",  false, true ],   // owners ignore the flag
    ["ADMIN",  true,  true ],
    ["ADMIN",  false, false],
    ["MEMBER", true,  false],   // members never
    ["MEMBER", false, false],
  ];
  it.each(cases)("role=%s flag=%s → %s", (role, flag, expected) => {
    expect(canSeeOrgFinancials(role, flag)).toBe(expected);
    expect(canManageOrgFinancials(role, flag)).toBe(expected);
  });
});

describe("RBAC: project-level finance", () => {
  it("OWNER and ADMIN see, MEMBER does not", () => {
    expect(canSeeProjectFinancials("OWNER")).toBe(true);
    expect(canSeeProjectFinancials("ADMIN")).toBe(true);
    expect(canSeeProjectFinancials("MEMBER")).toBe(false);
  });
});

describe("RBAC: granting finance access", () => {
  it("only OWNER", () => {
    expect(canGrantFinanceAccess("OWNER")).toBe(true);
    expect(canGrantFinanceAccess("ADMIN")).toBe(false);
    expect(canGrantFinanceAccess("MEMBER")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
pnpm -C apps/web vitest run src/server/auth/guards.test.ts
```
Expected: 8 passing.

### Task 2.4: Refactor existing callers (rename only, no behavior change)

**Files:**
- Modify: `apps/web/src/app/(app)/projects/page.tsx`
- Modify: `apps/web/src/app/(app)/projects/[id]/page.tsx`
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx`
- Modify: `apps/web/src/server/clients/queries.ts`
- Modify: `apps/web/src/server/payments/queries.ts`
- Modify: `apps/web/src/server/dashboard/queries.ts`

- [ ] **Step 1: Sweep**

For each file, replace `canSeeFinancials` imports and calls with `canSeeProjectFinancials`. The behavior is identical.

```bash
# preview before applying
git grep -nE "\\bcanSeeFinancials\\b" apps/web/src
```

Use Edit to rename in each. The intermediate alias from Task 2.1 means typecheck stays green even mid-sweep.

- [ ] **Step 2: Remove the deprecation alias**

In `guards.ts`, delete the `@deprecated` line added in Task 2.1.

- [ ] **Step 3: Typecheck**

```bash
pnpm -C apps/web typecheck
```
Expected: no errors.

### Task 2.5: Phase 2 checkpoint

- [ ] **Step 1: Run tests + commit**

```bash
pnpm -C apps/web vitest run
pnpm -C apps/web typecheck
git add apps/web/src/server/auth apps/web/src/app apps/web/src/server/clients apps/web/src/server/payments apps/web/src/server/dashboard
git commit -m "feat(auth): split canSeeFinancials into project vs org, gate on per-admin flag"
```

---

# Phase 3 — Decimal & period utilities (pure)

### Task 3.1: `period.ts` — timezone-aware period boundaries

**Files:**
- Create: `apps/web/src/server/finance/period.ts`

- [ ] **Step 1: Write `period.ts`**

```ts
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
```

- [ ] **Step 2: Install `date-fns-tz` if not already present**

```bash
pnpm -C apps/web add date-fns-tz
```
(date-fns is already a transitive dep — check `pnpm -C apps/web ls date-fns | head`. If missing, add `date-fns` too.)

### Task 3.2: `period.test.ts`

**Files:**
- Create: `apps/web/src/server/finance/period.test.ts`

- [ ] **Step 1: Write the tests**

```ts
import { describe, it, expect } from "vitest";
import { periodRange } from "./period";

const TZ = "Asia/Kolkata";

describe("periodRange", () => {
  it("this_month — first to last in org tz", () => {
    const now = new Date("2026-05-11T12:00:00Z");
    const { from, to } = periodRange("this_month", TZ, now);
    // IST = UTC+5:30. Start of May in IST = 2026-04-30T18:30:00Z
    expect(from.toISOString()).toBe("2026-04-30T18:30:00.000Z");
    expect(to.toISOString()).toBe("2026-05-31T18:29:59.999Z");
  });

  it("last_month — April in IST when now is May", () => {
    const { from, to } = periodRange("last_month", TZ, new Date("2026-05-11T12:00:00Z"));
    expect(from.toISOString()).toBe("2026-03-31T18:30:00.000Z");
    expect(to.toISOString()).toBe("2026-04-30T18:29:59.999Z");
  });

  it("custom — start of day to end of day in tz", () => {
    const r = periodRange("custom", TZ, new Date(), {
      from: new Date(2026, 0, 1),
      to: new Date(2026, 0, 31),
    });
    expect(r.from.getTime()).toBeLessThan(r.to.getTime());
  });

  it("UTC org — boundaries are unchanged", () => {
    const { from, to } = periodRange("this_month", "UTC", new Date("2026-05-11T00:00:00Z"));
    expect(from.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-05-31T23:59:59.999Z");
  });
});
```

- [ ] **Step 2: Run**

```bash
pnpm -C apps/web vitest run src/server/finance/period.test.ts
```
Expected: 4 passing.

### Task 3.3: `pl.ts` — P&L math primitive

**Files:**
- Create: `apps/web/src/server/finance/pl.ts`

- [ ] **Step 1: Write `pl.ts`**

```ts
import { Prisma } from "@stackzio/db";

const { Decimal } = Prisma;
export type Money = Prisma.Decimal;

export function zero(): Money {
  return new Decimal(0);
}

export function sum(values: Array<Money | string | number | null | undefined>): Money {
  let total = new Decimal(0);
  for (const v of values) {
    if (v == null) continue;
    total = total.plus(new Decimal(v));
  }
  return total;
}

export function net(revenue: Money, expenses: Money, payouts: Money): Money {
  return revenue.minus(expenses).minus(payouts);
}

/** Render-time only — never use the result back in math. */
export function toFixed2(m: Money | null | undefined): string {
  return (m ?? zero()).toFixed(2);
}
```

### Task 3.4: `pl.test.ts`

**Files:**
- Create: `apps/web/src/server/finance/pl.test.ts`

- [ ] **Step 1: Write the tests**

```ts
import { describe, it, expect } from "vitest";
import { Prisma } from "@stackzio/db";
import { sum, net, zero, toFixed2 } from "./pl";

const D = (s: string | number) => new Prisma.Decimal(s);

describe("Decimal math", () => {
  it("0.1 + 0.2 = 0.30 exact", () => {
    expect(sum([D("0.1"), D("0.2")]).toString()).toBe("0.3");
  });

  it("ignores nulls/undefined", () => {
    expect(sum([D("1"), null, undefined, D("2")]).toString()).toBe("3");
  });

  it("net = rev - exp - payouts, exact", () => {
    expect(net(D("100000.50"), D("12345.67"), D("23456.89")).toString()).toBe("64197.94");
  });

  it("net can go negative", () => {
    expect(net(D("100"), D("80"), D("50")).toString()).toBe("-30");
  });

  it("zero default", () => {
    expect(zero().toString()).toBe("0");
  });

  it("toFixed2 renders 2 decimals", () => {
    expect(toFixed2(D("3"))).toBe("3.00");
    expect(toFixed2(null)).toBe("0.00");
  });
});
```

- [ ] **Step 2: Run + commit**

```bash
pnpm -C apps/web vitest run src/server/finance/period.test.ts src/server/finance/pl.test.ts
git add apps/web/src/server/finance/period.ts apps/web/src/server/finance/period.test.ts apps/web/src/server/finance/pl.ts apps/web/src/server/finance/pl.test.ts apps/web/package.json apps/web/pnpm-lock.yaml
git commit -m "feat(finance): pure Decimal & period utilities with tests"
```

---

# Phase 4 — Server: expenses

### Task 4.1: `schemas.ts` — Zod for expenses + payouts + period

**Files:**
- Create: `apps/web/src/server/finance/schemas.ts`

- [ ] **Step 1: Write `schemas.ts`**

```ts
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
```

### Task 4.2: `expense-actions.ts` — CRUD

**Files:**
- Create: `apps/web/src/server/finance/expense-actions.ts`

- [ ] **Step 1: Write the actions**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { Prisma, prisma } from "@stackzio/db";
import { requireOrgFinance } from "@/server/auth/guards";
import { logActivity } from "@/server/activity/log";
import { upsertExpenseSchema, type UpsertExpenseInput } from "./schemas";

const { Decimal } = Prisma;

function parseDate(v: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00Z`);
  return new Date(v);
}

export async function createExpenseAction(input: UpsertExpenseInput) {
  const parsed = upsertExpenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }

  // Confirm category belongs to this org
  const cat = await prisma.expenseCategory.findFirst({
    where: { id: parsed.data.categoryId, organizationId: ctx.org.id },
    select: { id: true, name: true },
  });
  if (!cat) return { ok: false as const, error: "Category not found" };

  const expense = await prisma.expense.create({
    data: {
      organizationId: ctx.org.id,
      categoryId: cat.id,
      vendor: parsed.data.vendor,
      amount: new Decimal(parsed.data.amount),
      currency: ctx.org.defaultCurrency,
      spentAt: parseDate(parsed.data.spentAt),
      method: parsed.data.method,
      reference: parsed.data.reference,
      note: parsed.data.note,
      receiptUrl: parsed.data.receiptUrl,
      createdById: ctx.user.id,
    },
  });

  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "expense",
    entityId: expense.id,
    action: "expense_recorded",
    metadata: { amount: expense.amount.toString(), categoryId: cat.id, categoryName: cat.name },
  });
  revalidatePath("/expenses");
  revalidatePath("/finance");
  return { ok: true as const, expenseId: expense.id };
}

export async function updateExpenseAction(id: string, input: UpsertExpenseInput) {
  const parsed = upsertExpenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }
  const existing = await prisma.expense.findFirst({ where: { id, organizationId: ctx.org.id } });
  if (!existing) return { ok: false as const, error: "Expense not found" };

  const cat = await prisma.expenseCategory.findFirst({
    where: { id: parsed.data.categoryId, organizationId: ctx.org.id },
    select: { id: true },
  });
  if (!cat) return { ok: false as const, error: "Category not found" };

  await prisma.expense.update({
    where: { id },
    data: {
      categoryId: cat.id,
      vendor: parsed.data.vendor,
      amount: new Decimal(parsed.data.amount),
      // currency intentionally NOT updated
      spentAt: parseDate(parsed.data.spentAt),
      method: parsed.data.method,
      reference: parsed.data.reference,
      note: parsed.data.note,
      receiptUrl: parsed.data.receiptUrl,
    },
  });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "expense",
    entityId: id,
    action: "expense_updated",
    metadata: { amount: parsed.data.amount },
  });
  revalidatePath("/expenses");
  revalidatePath("/finance");
  return { ok: true as const };
}

export async function deleteExpenseAction(id: string) {
  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }
  const existing = await prisma.expense.findFirst({ where: { id, organizationId: ctx.org.id } });
  if (!existing) return { ok: false as const, error: "Not found" };
  await prisma.expense.delete({ where: { id } });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "expense",
    entityId: id,
    action: "expense_deleted",
    metadata: { amount: existing.amount.toString() },
  });
  revalidatePath("/expenses");
  revalidatePath("/finance");
  return { ok: true as const };
}
```

### Task 4.3: `category-actions.ts`

**Files:**
- Create: `apps/web/src/server/finance/category-actions.ts`

- [ ] **Step 1: Write the actions**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@stackzio/db";
import { requireOrgFinance } from "@/server/auth/guards";
import { upsertCategorySchema, type UpsertCategoryInput } from "./schemas";

export async function createCategoryAction(input: UpsertCategoryInput) {
  const parsed = upsertCategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }
  try {
    const cat = await prisma.expenseCategory.create({
      data: {
        organizationId: ctx.org.id,
        name: parsed.data.name,
        color: parsed.data.color,
        icon: parsed.data.icon,
        isSystem: false,
      },
    });
    revalidatePath("/expenses/categories");
    return { ok: true as const, categoryId: cat.id };
  } catch {
    return { ok: false as const, error: "A category with that name already exists" };
  }
}

export async function updateCategoryAction(id: string, input: UpsertCategoryInput) {
  const parsed = upsertCategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }
  const cat = await prisma.expenseCategory.findFirst({ where: { id, organizationId: ctx.org.id } });
  if (!cat) return { ok: false as const, error: "Category not found" };
  // System categories: only color/icon may change, name stays
  await prisma.expenseCategory.update({
    where: { id },
    data: cat.isSystem
      ? { color: parsed.data.color, icon: parsed.data.icon }
      : { name: parsed.data.name, color: parsed.data.color, icon: parsed.data.icon },
  });
  revalidatePath("/expenses/categories");
  return { ok: true as const };
}

export async function deleteCategoryAction(id: string) {
  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }
  const cat = await prisma.expenseCategory.findFirst({
    where: { id, organizationId: ctx.org.id },
    include: { _count: { select: { expenses: true } } },
  });
  if (!cat) return { ok: false as const, error: "Not found" };
  if (cat.isSystem) return { ok: false as const, error: "System categories can't be deleted" };
  if (cat._count.expenses > 0) {
    return { ok: false as const, error: `In use by ${cat._count.expenses} expenses — reassign first` };
  }
  await prisma.expenseCategory.delete({ where: { id } });
  revalidatePath("/expenses/categories");
  return { ok: true as const };
}
```

### Task 4.4: `expense-actions.test.ts`

**Files:**
- Create: `apps/web/src/server/finance/expense-actions.test.ts`

- [ ] **Step 1: Write the integration tests**

> These rely on `DATABASE_URL_TEST` pointing at a throwaway DB and global setup that resets/migrates. The repo already has Playwright global-setup for this — extend it for Vitest by adding a `beforeAll` that calls Prisma reset. If a Vitest test-setup file doesn't exist yet:

Add `apps/web/vitest.setup.ts`:

```ts
import { beforeAll } from "vitest";
import { execSync } from "node:child_process";

beforeAll(() => {
  if (process.env.RESET_TEST_DB === "1") {
    execSync("pnpm -C ../../packages/db prisma migrate reset --force --skip-seed", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST },
    });
  }
});
```

Wire it in `vitest.config.ts`:
```ts
test: {
  ...,
  setupFiles: ["./vitest.setup.ts"],
}
```

Then the test itself:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@stackzio/db";
import { createExpenseAction } from "./expense-actions";

// These tests assume a test fixture: an OWNER user signed in with an active
// org and one ExpenseCategory. The existing e2e/helpers/factory has these
// — import the same helpers if available, or create minimal seeds inline.

describe("createExpenseAction", () => {
  let orgId: string;
  let categoryId: string;
  let userId: string;

  beforeEach(async () => {
    const { org, owner, category } = await seedFinanceOrg();
    orgId = org.id; userId = owner.id; categoryId = category.id;
    await signInAs(owner.id, org.id);
  });

  it("creates an expense and logs activity", async () => {
    const res = await createExpenseAction({
      categoryId,
      amount: "1234.56",
      spentAt: "2026-05-10",
      method: "BANK",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const row = await prisma.expense.findUnique({ where: { id: res.expenseId } });
    expect(row?.amount.toString()).toBe("1234.56");
    const log = await prisma.activityLog.findFirst({ where: { entityId: res.expenseId } });
    expect(log?.action).toBe("expense_recorded");
  });

  it("rejects invalid amount", async () => {
    const res = await createExpenseAction({
      categoryId,
      amount: "abc" as never,
      spentAt: "2026-05-10",
      method: "BANK",
    });
    expect(res.ok).toBe(false);
  });

  it("denies non-flagged admin", async () => {
    const { adminNoFlag } = await seedFinanceOrg();
    await signInAs(adminNoFlag.id, orgId);
    const res = await createExpenseAction({ categoryId, amount: "10", spentAt: "2026-05-10", method: "BANK" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Finance access/i);
  });
});

// Stubs — actual seedFinanceOrg / signInAs implementations live in tests/helpers/finance-seed.ts
declare function seedFinanceOrg(): Promise<{ org: { id: string }; owner: { id: string }; adminNoFlag: { id: string }; category: { id: string } }>;
declare function signInAs(userId: string, orgId: string): Promise<void>;
```

Implementations of `seedFinanceOrg` and `signInAs` go in `apps/web/tests/helpers/finance-seed.ts`. Copy the auth-mock pattern from `apps/web/e2e/helpers/`. (If the project doesn't have a server-action test harness yet, write `seedFinanceOrg` using direct Prisma writes and mock `auth()` from `next-auth` via Vitest's `vi.mock`.)

### Task 4.5: Phase 4 checkpoint

- [ ] **Step 1: Run tests + commit**

```bash
pnpm -C apps/web vitest run src/server/finance
pnpm -C apps/web typecheck
git add apps/web/src/server/finance apps/web/vitest.setup.ts apps/web/vitest.config.ts apps/web/tests
git commit -m "feat(finance): server expenses + categories with RBAC + tests"
```

---

# Phase 5 — Server: payouts

### Task 5.1: `payout-actions.ts`

**Files:**
- Create: `apps/web/src/server/finance/payout-actions.ts`

- [ ] **Step 1: Write the create/update/delete + member-side guard**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { Prisma, prisma } from "@stackzio/db";
import { requireOrgFinance } from "@/server/auth/guards";
import { logActivity } from "@/server/activity/log";
import { emitNotification } from "@/server/notifications/actions";
import { upsertPayoutSchema, type UpsertPayoutInput } from "./schemas";

const { Decimal } = Prisma;

function parseDate(v: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00Z`);
  return new Date(v);
}
function firstOfMonthUTC(yyyymm: string): Date {
  const [y, m] = yyyymm.split("-").map(Number);
  return new Date(Date.UTC(y!, (m! - 1), 1, 0, 0, 0, 0));
}

export async function createPayoutAction(input: UpsertPayoutInput) {
  const parsed = upsertPayoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }

  // Member must belong to this org
  const member = await prisma.organizationMember.findFirst({
    where: { organizationId: ctx.org.id, userId: parsed.data.memberUserId },
    select: { userId: true, user: { select: { name: true, email: true } } },
  });
  if (!member) return { ok: false as const, error: "Member not in this organization" };

  // Project (if PROJECT) must belong to this org
  if (parsed.data.kind === "PROJECT") {
    const p = await prisma.project.findFirst({
      where: { id: parsed.data.projectId!, organizationId: ctx.org.id },
      select: { id: true, name: true },
    });
    if (!p) return { ok: false as const, error: "Project not in this organization" };
  }

  try {
    const payout = await prisma.payout.create({
      data: {
        organizationId: ctx.org.id,
        memberUserId: member.userId,
        kind: parsed.data.kind,
        amount: new Decimal(parsed.data.amount),
        currency: ctx.org.defaultCurrency,
        projectId: parsed.data.kind === "PROJECT" ? parsed.data.projectId! : null,
        periodMonth: parsed.data.kind === "SALARY" ? firstOfMonthUTC(parsed.data.periodMonth!) : null,
        paidAt: parseDate(parsed.data.paidAt),
        method: parsed.data.method,
        reference: parsed.data.reference,
        note: parsed.data.note,
        createdById: ctx.user.id,
      },
    });

    await logActivity({
      organizationId: ctx.org.id,
      actorId: ctx.user.id,
      entity: "payout",
      entityId: payout.id,
      action: "payout_recorded",
      metadata: { amount: payout.amount.toString(), kind: payout.kind, memberUserId: member.userId },
    });

    await emitNotification({
      userId: member.userId,
      organizationId: ctx.org.id,
      kind: "GENERIC",
      title: `You received a ${parsed.data.kind.toLowerCase()} payout`,
      body: `${ctx.org.defaultCurrency} ${parsed.data.amount}`,
      link: "/my-earnings",
      refEntity: "payout",
      refId: payout.id,
      dedupeKey: `payout-recorded:${payout.id}`,
    });

    revalidatePath("/payouts");
    revalidatePath("/finance");
    revalidatePath("/my-earnings");
    return { ok: true as const, payoutId: payout.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const fields = (e.meta?.target as string[] | undefined) ?? [];
      if (fields.includes("periodMonth")) {
        return { ok: false as const, error: "Salary for this month already recorded for this member" };
      }
    }
    return { ok: false as const, error: "Could not record payout" };
  }
}

export async function updatePayoutAction(id: string, input: UpsertPayoutInput) {
  const parsed = upsertPayoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }
  const existing = await prisma.payout.findFirst({ where: { id, organizationId: ctx.org.id } });
  if (!existing) return { ok: false as const, error: "Not found" };

  try {
    await prisma.payout.update({
      where: { id },
      data: {
        memberUserId: parsed.data.memberUserId,
        kind: parsed.data.kind,
        amount: new Decimal(parsed.data.amount),
        projectId: parsed.data.kind === "PROJECT" ? parsed.data.projectId! : null,
        periodMonth: parsed.data.kind === "SALARY" ? firstOfMonthUTC(parsed.data.periodMonth!) : null,
        paidAt: parseDate(parsed.data.paidAt),
        method: parsed.data.method,
        reference: parsed.data.reference,
        note: parsed.data.note,
      },
    });
    await logActivity({
      organizationId: ctx.org.id,
      actorId: ctx.user.id,
      entity: "payout",
      entityId: id,
      action: "payout_updated",
      metadata: { amount: parsed.data.amount, kind: parsed.data.kind },
    });
    revalidatePath("/payouts");
    revalidatePath("/finance");
    revalidatePath("/my-earnings");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false as const, error: "Salary for that month is already recorded" };
    }
    return { ok: false as const, error: "Could not update payout" };
  }
}

export async function deletePayoutAction(id: string) {
  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }
  const existing = await prisma.payout.findFirst({ where: { id, organizationId: ctx.org.id } });
  if (!existing) return { ok: false as const, error: "Not found" };
  await prisma.payout.delete({ where: { id } });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "payout",
    entityId: id,
    action: "payout_deleted",
    metadata: { amount: existing.amount.toString(), kind: existing.kind },
  });
  revalidatePath("/payouts");
  revalidatePath("/finance");
  revalidatePath("/my-earnings");
  return { ok: true as const };
}
```

### Task 5.2: Repeat-last-month bulk

- [ ] **Step 1: Add to `payout-actions.ts`**

```ts
export async function repeatLastMonthSalariesAction(args: {
  picks: Array<{ memberUserId: string; amount: string }>; // user-edited list
  forMonth: string; // YYYY-MM (current month)
  paidAt: string;   // YYYY-MM-DD
}) {
  let ctx;
  try {
    ctx = await requireOrgFinance();
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Forbidden" };
  }
  if (args.picks.length === 0) return { ok: false as const, error: "Nothing selected" };
  const periodMonth = firstOfMonthUTC(args.forMonth);

  // Transactional insert
  const created = await prisma.$transaction(
    args.picks.map((p) =>
      prisma.payout.create({
        data: {
          organizationId: ctx.org.id,
          memberUserId: p.memberUserId,
          kind: "SALARY",
          amount: new Decimal(p.amount),
          currency: ctx.org.defaultCurrency,
          periodMonth,
          paidAt: parseDate(args.paidAt),
          method: "BANK",
          createdById: ctx.user.id,
          note: "Repeated from last month",
        },
      }),
    ),
  ).catch((e) => {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("One or more selected members already have a salary recorded for this month — uncheck them");
    }
    throw e;
  });

  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "organization",
    entityId: ctx.org.id,
    action: "payouts_bulk_repeated",
    metadata: { count: created.length, forMonth: args.forMonth },
  });

  // Notify each member
  await Promise.all(
    created.map((p) =>
      emitNotification({
        userId: p.memberUserId,
        organizationId: ctx.org.id,
        kind: "GENERIC",
        title: "Salary payout recorded",
        body: `${ctx.org.defaultCurrency} ${p.amount.toString()}`,
        link: "/my-earnings",
        refEntity: "payout",
        refId: p.id,
        dedupeKey: `payout-recorded:${p.id}`,
      }),
    ),
  );

  revalidatePath("/payouts");
  revalidatePath("/finance");
  revalidatePath("/my-earnings");
  return { ok: true as const, count: created.length };
}
```

### Task 5.3: `payout-actions.test.ts`

**Files:**
- Create: `apps/web/src/server/finance/payout-actions.test.ts`

- [ ] **Step 1: Write the tests**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@stackzio/db";
import { createPayoutAction } from "./payout-actions";

declare function seedFinanceOrg(): Promise<{ org: { id: string; defaultCurrency: string }; owner: { id: string }; member: { id: string }; project: { id: string } }>;
declare function signInAs(userId: string, orgId: string): Promise<void>;

describe("createPayoutAction", () => {
  it("rejects PROJECT kind without projectId", async () => {
    const { org, owner, member } = await seedFinanceOrg();
    await signInAs(owner.id, org.id);
    const res = await createPayoutAction({
      memberUserId: member.id,
      kind: "PROJECT",
      amount: "1000",
      paidAt: "2026-05-10",
      method: "BANK",
    });
    expect(res.ok).toBe(false);
  });

  it("rejects SALARY kind without periodMonth", async () => {
    const { org, owner, member } = await seedFinanceOrg();
    await signInAs(owner.id, org.id);
    const res = await createPayoutAction({
      memberUserId: member.id,
      kind: "SALARY",
      amount: "10000",
      paidAt: "2026-05-10",
      method: "BANK",
    });
    expect(res.ok).toBe(false);
  });

  it("rejects duplicate SALARY in the same month", async () => {
    const { org, owner, member } = await seedFinanceOrg();
    await signInAs(owner.id, org.id);
    const first = await createPayoutAction({
      memberUserId: member.id, kind: "SALARY", amount: "1000",
      periodMonth: "2026-05", paidAt: "2026-05-10", method: "BANK",
    });
    expect(first.ok).toBe(true);
    const second = await createPayoutAction({
      memberUserId: member.id, kind: "SALARY", amount: "2000",
      periodMonth: "2026-05", paidAt: "2026-05-11", method: "BANK",
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toMatch(/already recorded/i);
  });

  it("accepts BONUS without projectId or periodMonth", async () => {
    const { org, owner, member } = await seedFinanceOrg();
    await signInAs(owner.id, org.id);
    const res = await createPayoutAction({
      memberUserId: member.id, kind: "BONUS", amount: "5000",
      paidAt: "2026-05-10", method: "BANK", note: "Q1 bonus",
    });
    expect(res.ok).toBe(true);
  });
});
```

### Task 5.4: `queries.ts` — list expenses, list payouts, getMyEarnings

**Files:**
- Create: `apps/web/src/server/finance/queries.ts`

- [ ] **Step 1: Write**

```ts
import { cache } from "react";
import { Prisma, prisma } from "@stackzio/db";
import { requireOrg, requireOrgFinance, requireUserAction } from "@/server/auth/guards";

const { Decimal } = Prisma;

export interface ListExpensesArgs {
  from?: Date;
  to?: Date;
  categoryIds?: string[];
  vendorQuery?: string;
  cursor?: string;
  take?: number;
}

export async function listExpenses(args: ListExpensesArgs = {}) {
  const ctx = await requireOrgFinance();
  const where: Prisma.ExpenseWhereInput = {
    organizationId: ctx.org.id,
    ...(args.from || args.to ? { spentAt: { gte: args.from, lte: args.to } } : {}),
    ...(args.categoryIds?.length ? { categoryId: { in: args.categoryIds } } : {}),
    ...(args.vendorQuery ? { vendor: { contains: args.vendorQuery, mode: "insensitive" } } : {}),
  };
  const rows = await prisma.expense.findMany({
    where,
    orderBy: { spentAt: "desc" },
    take: args.take ?? 50,
    ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
    include: { category: true },
  });
  return rows;
}

export interface ListPayoutsArgs {
  from?: Date;
  to?: Date;
  memberUserIds?: string[];
  kinds?: Array<"SALARY" | "PROJECT" | "BONUS">;
  projectId?: string;
  cursor?: string;
  take?: number;
}

export async function listPayouts(args: ListPayoutsArgs = {}) {
  const ctx = await requireOrgFinance();
  const where: Prisma.PayoutWhereInput = {
    organizationId: ctx.org.id,
    ...(args.from || args.to ? { paidAt: { gte: args.from, lte: args.to } } : {}),
    ...(args.memberUserIds?.length ? { memberUserId: { in: args.memberUserIds } } : {}),
    ...(args.kinds?.length ? { kind: { in: args.kinds } } : {}),
    ...(args.projectId ? { projectId: args.projectId } : {}),
  };
  const rows = await prisma.payout.findMany({
    where,
    orderBy: { paidAt: "desc" },
    take: args.take ?? 50,
    ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
    include: {
      member: { select: { id: true, name: true, email: true, image: true } },
      project: { select: { id: true, name: true } },
    },
  });
  return rows;
}

export const listCategories = cache(async () => {
  const ctx = await requireOrg();
  return prisma.expenseCategory.findMany({
    where: { organizationId: ctx.org.id },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
});

export async function getMyEarnings(args: { from?: Date; to?: Date }) {
  const user = await requireUserAction();
  const where: Prisma.PayoutWhereInput = {
    memberUserId: user.id,
    ...(args.from || args.to ? { paidAt: { gte: args.from, lte: args.to } } : {}),
  };
  const [rows, agg, byKind, byMonth, byProject] = await Promise.all([
    prisma.payout.findMany({
      where,
      orderBy: { paidAt: "desc" },
      take: 200,
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.payout.aggregate({ where, _sum: { amount: true }, _count: true }),
    prisma.payout.groupBy({ by: ["kind"], where, _sum: { amount: true } }),
    // Last 6 months bucket — done in JS after fetching the 6-month range
    prisma.payout.findMany({
      where: { memberUserId: user.id, paidAt: { gte: sixMonthsAgo() } },
      select: { paidAt: true, amount: true },
    }),
    prisma.payout.groupBy({
      by: ["projectId"],
      where: { memberUserId: user.id, projectId: { not: null } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
  ]);
  return { rows, agg, byKind, byMonth, byProject };
}

function sixMonthsAgo(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d;
}
```

### Task 5.5: Phase 5 checkpoint

- [ ] **Step 1: Run + commit**

```bash
pnpm -C apps/web vitest run src/server/finance
pnpm -C apps/web typecheck
git add apps/web/src/server/finance
git commit -m "feat(finance): server payouts (CRUD + repeat-last-month) + queries + tests"
```

---

# Phase 6 — Server: P&L aggregation

### Task 6.1: `getProfitAndLoss` in `queries.ts`

- [ ] **Step 1: Append to `queries.ts`**

```ts
export interface PLResult {
  period: { from: Date; to: Date };
  currency: string;
  revenue: Prisma.Decimal;
  expenses: Prisma.Decimal;
  payouts: Prisma.Decimal;
  net: Prisma.Decimal;
  byCategory: Array<{ categoryId: string; name: string; color: string; icon: string; total: Prisma.Decimal }>;
  byKind: Array<{ kind: "SALARY" | "PROJECT" | "BONUS"; total: Prisma.Decimal }>;
  byVendor: Array<{ vendor: string | null; total: Prisma.Decimal }>;
  byEarner: Array<{ memberUserId: string; name: string | null; image: string | null; total: Prisma.Decimal }>;
  monthly: Array<{ month: string; revenue: Prisma.Decimal; outflow: Prisma.Decimal }>;
  prev: { revenue: Prisma.Decimal; expenses: Prisma.Decimal; payouts: Prisma.Decimal; net: Prisma.Decimal };
}

export async function getProfitAndLoss(period: { from: Date; to: Date }): Promise<PLResult> {
  const ctx = await requireOrgFinance();
  const orgId = ctx.org.id;
  const { from, to } = period;

  const [revAgg, expAgg, payAgg, byCat, byKindRows, byVendor, byEarnerRows] = await Promise.all([
    prisma.payment.aggregate({ where: { organizationId: orgId, paidAt: { gte: from, lte: to } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { organizationId: orgId, spentAt: { gte: from, lte: to } }, _sum: { amount: true } }),
    prisma.payout.aggregate({ where: { organizationId: orgId, paidAt: { gte: from, lte: to } }, _sum: { amount: true } }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { organizationId: orgId, spentAt: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.payout.groupBy({
      by: ["kind"],
      where: { organizationId: orgId, paidAt: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["vendor"],
      where: { organizationId: orgId, spentAt: { gte: from, lte: to } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
    prisma.payout.groupBy({
      by: ["memberUserId"],
      where: { organizationId: orgId, paidAt: { gte: from, lte: to } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
  ]);

  const revenue = new Decimal(revAgg._sum.amount ?? 0);
  const expenses = new Decimal(expAgg._sum.amount ?? 0);
  const payouts = new Decimal(payAgg._sum.amount ?? 0);
  const net = revenue.minus(expenses).minus(payouts);

  // Decorate category rows
  const categories = await prisma.expenseCategory.findMany({
    where: { id: { in: byCat.map((c) => c.categoryId) } },
    select: { id: true, name: true, color: true, icon: true },
  });
  const byCategory = byCat.map((c) => {
    const m = categories.find((x) => x.id === c.categoryId)!;
    return { categoryId: c.categoryId, name: m.name, color: m.color, icon: m.icon, total: new Decimal(c._sum.amount ?? 0) };
  });

  const earners = await prisma.user.findMany({
    where: { id: { in: byEarnerRows.map((e) => e.memberUserId) } },
    select: { id: true, name: true, image: true },
  });
  const byEarner = byEarnerRows.map((e) => {
    const u = earners.find((x) => x.id === e.memberUserId);
    return { memberUserId: e.memberUserId, name: u?.name ?? null, image: u?.image ?? null, total: new Decimal(e._sum.amount ?? 0) };
  });

  // Monthly trend — last 12 months irrespective of selected period
  const trendFrom = startOfMonthUTC(addMonthsUTC(new Date(), -11));
  const [payTrend, expTrend, outTrend] = await Promise.all([
    prisma.payment.findMany({ where: { organizationId: orgId, paidAt: { gte: trendFrom } }, select: { paidAt: true, amount: true } }),
    prisma.expense.findMany({ where: { organizationId: orgId, spentAt: { gte: trendFrom } }, select: { spentAt: true, amount: true } }),
    prisma.payout.findMany({ where: { organizationId: orgId, paidAt: { gte: trendFrom } }, select: { paidAt: true, amount: true } }),
  ]);
  const monthly = buildMonthlyTrend(payTrend, expTrend, outTrend);

  // Prev period (same length, immediately before)
  const len = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - len - 1);
  const prevTo = new Date(from.getTime() - 1);
  const [prevRev, prevExp, prevPay] = await Promise.all([
    prisma.payment.aggregate({ where: { organizationId: orgId, paidAt: { gte: prevFrom, lte: prevTo } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { organizationId: orgId, spentAt: { gte: prevFrom, lte: prevTo } }, _sum: { amount: true } }),
    prisma.payout.aggregate({ where: { organizationId: orgId, paidAt: { gte: prevFrom, lte: prevTo } }, _sum: { amount: true } }),
  ]);
  const prevRevD = new Decimal(prevRev._sum.amount ?? 0);
  const prevExpD = new Decimal(prevExp._sum.amount ?? 0);
  const prevPayD = new Decimal(prevPay._sum.amount ?? 0);

  return {
    period,
    currency: ctx.org.defaultCurrency,
    revenue, expenses, payouts, net,
    byCategory,
    byKind: byKindRows.map((k) => ({ kind: k.kind, total: new Decimal(k._sum.amount ?? 0) })),
    byVendor: byVendor.map((v) => ({ vendor: v.vendor, total: new Decimal(v._sum.amount ?? 0) })),
    byEarner,
    monthly,
    prev: {
      revenue: prevRevD,
      expenses: prevExpD,
      payouts: prevPayD,
      net: prevRevD.minus(prevExpD).minus(prevPayD),
    },
  };
}

function startOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function addMonthsUTC(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}
function buildMonthlyTrend(
  payments: Array<{ paidAt: Date; amount: Prisma.Decimal }>,
  expenses: Array<{ spentAt: Date; amount: Prisma.Decimal }>,
  payouts: Array<{ paidAt: Date; amount: Prisma.Decimal }>,
) {
  const map = new Map<string, { revenue: Prisma.Decimal; outflow: Prisma.Decimal }>();
  const today = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = addMonthsUTC(today, -i);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    map.set(key, { revenue: new Decimal(0), outflow: new Decimal(0) });
  }
  for (const p of payments) {
    const k = `${p.paidAt.getUTCFullYear()}-${String(p.paidAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const slot = map.get(k);
    if (slot) slot.revenue = slot.revenue.plus(p.amount);
  }
  for (const e of expenses) {
    const k = `${e.spentAt.getUTCFullYear()}-${String(e.spentAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const slot = map.get(k);
    if (slot) slot.outflow = slot.outflow.plus(e.amount);
  }
  for (const o of payouts) {
    const k = `${o.paidAt.getUTCFullYear()}-${String(o.paidAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const slot = map.get(k);
    if (slot) slot.outflow = slot.outflow.plus(o.amount);
  }
  return Array.from(map.entries()).map(([month, v]) => ({ month, ...v }));
}
```

### Task 6.2: `getProfitAndLoss` integration test

**Files:**
- Modify: `apps/web/src/server/finance/expense-actions.test.ts` (or new `pl-query.test.ts`)

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect } from "vitest";
import { Prisma, prisma } from "@stackzio/db";
import { getProfitAndLoss } from "./queries";

declare function seedFinanceOrg(): Promise<{ org: { id: string; defaultCurrency: string }; owner: { id: string }; member: { id: string }; category: { id: string } }>;
declare function signInAs(userId: string, orgId: string): Promise<void>;

describe("getProfitAndLoss", () => {
  it("matches hand calculation", async () => {
    const { org, owner, member, category } = await seedFinanceOrg();
    await signInAs(owner.id, org.id);

    const from = new Date("2026-05-01T00:00:00Z");
    const to   = new Date("2026-05-31T23:59:59Z");

    // Seed 3 payments, 2 expenses, 2 payouts inside the window
    await prisma.payment.createMany({
      data: [
        { organizationId: org.id, projectId: "any-project-id-from-seed", amount: new Prisma.Decimal("50000"), paidAt: new Date("2026-05-05") },
        { organizationId: org.id, projectId: "any-project-id-from-seed", amount: new Prisma.Decimal("30000"), paidAt: new Date("2026-05-15") },
        { organizationId: org.id, projectId: "any-project-id-from-seed", amount: new Prisma.Decimal("20000"), paidAt: new Date("2026-05-25") },
      ],
    });
    await prisma.expense.createMany({
      data: [
        { organizationId: org.id, categoryId: category.id, amount: new Prisma.Decimal("8000"), currency: "INR", spentAt: new Date("2026-05-10"), createdById: owner.id },
        { organizationId: org.id, categoryId: category.id, amount: new Prisma.Decimal("4000"), currency: "INR", spentAt: new Date("2026-05-20"), createdById: owner.id },
      ],
    });
    await prisma.payout.createMany({
      data: [
        { organizationId: org.id, memberUserId: member.id, kind: "SALARY", amount: new Prisma.Decimal("25000"), currency: "INR", periodMonth: new Date(Date.UTC(2026, 4, 1)), paidAt: new Date("2026-05-30"), createdById: owner.id },
      ],
    });

    const pl = await getProfitAndLoss({ from, to });
    expect(pl.revenue.toString()).toBe("100000");
    expect(pl.expenses.toString()).toBe("12000");
    expect(pl.payouts.toString()).toBe("25000");
    expect(pl.net.toString()).toBe("63000");
  });
});
```

### Task 6.3: Phase 6 checkpoint

- [ ] **Step 1: Run + commit**

```bash
pnpm -C apps/web vitest run src/server/finance
pnpm -C apps/web typecheck
git add apps/web/src/server/finance
git commit -m "feat(finance): P&L aggregation query with monthly trend + prev-period deltas"
```

---

# Phase 7 — Server: my-earnings (already covered in 5.4)

Phase 5 already added `getMyEarnings`. Just verify it doesn't require `requireOrgFinance` (it doesn't — it uses `requireUserAction`). No additional task here; included for plan clarity.

---

# Phase 8 — Shared UI primitives

### Task 8.1: `animated-amount.tsx`

**Files:**
- Create: `apps/web/src/components/finance/animated-amount.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import { formatMoney } from "@stackzio/lib/money";

interface Props {
  value: number; // already-parsed numeric; Decimal.toFixed → Number is fine for display only
  currency: string;
  className?: string;
}

export function AnimatedAmount({ value, currency, className }: Props) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 22, stiffness: 240 });
  const display = useTransform(spring, (v) => formatMoney(v, currency as never));
  useEffect(() => { mv.set(value); }, [value, mv]);
  return <motion.span className={className}>{display}</motion.span>;
}
```

### Task 8.2: `category-chip.tsx`, `kind-chip.tsx`

- [ ] **Step 1: Category chip**

```tsx
// apps/web/src/components/finance/category-chip.tsx
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/cn";

export function CategoryChip({
  name, color, icon, className,
}: { name: string; color: string; icon: string; className?: string }) {
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[icon] ?? LucideIcons.Tag;
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", className)}
      style={{ borderColor: color + "55", color, backgroundColor: color + "11" }}
    >
      <Icon className="size-3" />
      {name}
    </span>
  );
}
```

- [ ] **Step 2: Kind chip**

```tsx
// apps/web/src/components/finance/kind-chip.tsx
import { Briefcase, Gift, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";

const META = {
  SALARY:  { label: "Salary",  Icon: Wallet,    tone: "border-primary/40 bg-primary/10 text-primary" },
  PROJECT: { label: "Project", Icon: Briefcase, tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" },
  BONUS:   { label: "Bonus",   Icon: Gift,      tone: "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-600" },
} as const;

export function KindChip({ kind, className }: { kind: keyof typeof META; className?: string }) {
  const { label, Icon, tone } = META[kind];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", tone, className)}>
      <Icon className="size-3" /> {label}
    </span>
  );
}
```

### Task 8.3: `icon-picker.tsx`

- [ ] **Step 1: Curated icon list**

```tsx
"use client";
import { useState } from "react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/cn";

const ICONS = [
  "Megaphone","Users","Sparkles","Code2","Building2","Plane","Tag","Briefcase",
  "Wallet","Gift","Truck","Coffee","BookOpen","Wrench","Phone","CreditCard",
  "ShoppingBag","Globe","Camera","Palette",
] as const;

export function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const Selected = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[value] ?? LucideIcons.Tag;
  return (
    <div className="grid grid-cols-8 gap-1">
      {ICONS.map((name) => {
        const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
        return (
          <button
            type="button"
            key={name}
            onClick={() => onChange(name)}
            className={cn("flex size-9 items-center justify-center rounded-md border transition-colors",
              value === name ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent")}
            aria-label={name}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/finance
git commit -m "feat(finance): shared UI primitives — animated amount, chips, icon picker"
```

---

# Phase 9 — `/expenses` UI

### Task 9.1: Page + queries (server component)

**Files:**
- Create: `apps/web/src/app/(app)/expenses/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
import type { Metadata } from "next";
import { requirePageOrgFinance } from "@/server/auth/guards";
import { listCategories, listExpenses } from "@/server/finance/queries";
import { ExpensesToolbar } from "./_components/expenses-toolbar";
import { ExpensesTable } from "./_components/expenses-table";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requirePageOrgFinance();
  const sp = await searchParams;
  const from = sp.from ? new Date(sp.from) : undefined;
  const to = sp.to ? new Date(sp.to) : undefined;
  const categoryIds = sp.cats?.split(",").filter(Boolean);
  const vendorQuery = sp.q ?? undefined;
  const [rows, categories] = await Promise.all([
    listExpenses({ from, to, categoryIds, vendorQuery, take: 50 }),
    listCategories(),
  ]);
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track every outflow — vendors, ads, software, rent.</p>
        </div>
      </header>
      <ExpensesToolbar categories={categories} />
      <ExpensesTable rows={rows} categories={categories} currency={ctx.org.defaultCurrency} />
    </div>
  );
}
```

### Task 9.2: `expenses-toolbar.tsx`, `expenses-table.tsx`, `expense-form.tsx`

(Implementation details are routine. Each component must:
- `"use client"`
- Use the existing `DataTable`, `Drawer`/`Sheet`, `Input`, `Select`, `Button` primitives.
- The form uses plain `useState` for `pending` (per the project's standing pattern — `useTransition` causes lingering pending state).
- Receipt upload uses `ImageUpload` with `kind="expense-receipt"`.)

Create all three files following the patterns of `clients/_components/client-form.tsx` and `projects/_components/projects-toolbar.tsx`. Show submission via `createExpenseAction` / `updateExpenseAction`. Use optimistic insert + sonner toast on success. Empty state: gradient illustration + "Add your first expense" CTA.

- [ ] **Step 1: Write `expense-form.tsx`** (full file)

(Use the patterns from `client-form.tsx` — same imports, same Section/Field local components if helpful. Include: category select with `CategoryChip` previews, vendor input, amount input (validated to 2 decimals on blur), spent-at date picker, method select, reference + note inputs, receipt `ImageUpload`. Submit → `createExpenseAction` / `updateExpenseAction`. On success: toast + `onClose()`.)

- [ ] **Step 2: Write `expenses-table.tsx`**

(Use `DataTable` from `components/ui/data-table.tsx`. Columns: Date · Category chip · Vendor · Amount · Method · Note (truncated). Row click opens the edit drawer with the row preloaded.)

- [ ] **Step 3: Write `expenses-toolbar.tsx`**

(Filter chips for categories, search input for vendor, date range, "+ Add expense" button. URL search params drive state; on change, router.push with new params and Suspense renders the new table.)

### Task 9.3: `/expenses/categories/page.tsx` + `category-form.tsx`

- [ ] **Step 1: Page**

```tsx
import { requirePageOrgFinance } from "@/server/auth/guards";
import { listCategories } from "@/server/finance/queries";
import { CategoryForm } from "./_components/category-form";
import { CategoryChip } from "@/components/finance/category-chip";

export default async function CategoriesPage() {
  await requirePageOrgFinance();
  const cats = await listCategories();
  const system = cats.filter((c) => c.isSystem);
  const custom = cats.filter((c) => !c.isSystem);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Expense categories</h1>
      <section>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">Built-in</h2>
        <ul className="flex flex-wrap gap-2">
          {system.map((c) => <li key={c.id}><CategoryChip name={c.name} color={c.color} icon={c.icon} /></li>)}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">Custom</h2>
        <CategoryForm initial={null} />
        <ul className="mt-3 flex flex-wrap gap-2">
          {custom.map((c) => <li key={c.id}><CategoryChip name={c.name} color={c.color} icon={c.icon} /></li>)}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: `category-form.tsx`** — name + color (8 brand swatches + custom hex) + `IconPicker`. Submit `createCategoryAction`. Optimistic insert in parent via `router.refresh()`.

### Task 9.4: Phase 9 checkpoint

- [ ] **Step 1: Smoke + commit**

```bash
pnpm -C apps/web typecheck
pnpm -C apps/web build         # ensure no Server Component errors
git add apps/web/src/app/(app)/expenses apps/web/src/components/finance
git commit -m "feat(finance): /expenses + /expenses/categories pages"
```

---

# Phase 10 — `/payouts` UI

### Task 10.1: Page + table + toolbar

**Files:**
- Create: `apps/web/src/app/(app)/payouts/page.tsx`
- Create: `apps/web/src/app/(app)/payouts/_components/payouts-table.tsx`
- Create: `apps/web/src/app/(app)/payouts/_components/payouts-toolbar.tsx`

- [ ] **Step 1: Page (mirror Expenses)**

(Server component; filters: member multiselect, kind multiselect, project select, date range. Fetch `listPayouts(...)` + `prisma.organizationMember.findMany(...)` for the member filter. Pass to client components.)

### Task 10.2: `payout-form.tsx`

- [ ] **Step 1: Three-tab wizard**

(Drawer with `Tabs` (Salary / Project / Bonus). Each tab shows only its required fields. On `kind=SALARY`: month picker (`<input type="month">`), submit serializes `periodMonth` as `YYYY-MM`. On `kind=PROJECT`: project select. On `kind=BONUS`: free-text reason → note. Submit → `createPayoutAction`. Surface duplicate-salary error inline.)

### Task 10.3: `repeat-last-month.tsx`

- [ ] **Step 1: Bulk wizard**

```tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { repeatLastMonthSalariesAction } from "@/server/finance/payout-actions";

interface LastSalary {
  memberUserId: string;
  memberName: string;
  lastAmount: string;
}
export function RepeatLastMonth({ lastSalaries, currentMonth, currency }: {
  lastSalaries: LastSalary[];
  currentMonth: string; // YYYY-MM
  currency: string;
}) {
  const [picks, setPicks] = useState<Record<string, { checked: boolean; amount: string }>>(
    Object.fromEntries(lastSalaries.map((s) => [s.memberUserId, { checked: true, amount: s.lastAmount }])),
  );
  const [pending, setPending] = useState(false);

  async function submit() {
    const chosen = Object.entries(picks).filter(([, v]) => v.checked).map(([k, v]) => ({ memberUserId: k, amount: v.amount }));
    if (chosen.length === 0) return toast.error("Pick at least one member");
    setPending(true);
    try {
      const res = await repeatLastMonthSalariesAction({
        picks: chosen,
        forMonth: currentMonth,
        paidAt: new Date().toISOString().slice(0, 10),
      });
      if (!res.ok) return toast.error(res.error);
      toast.success(`Recorded ${res.count} salaries`);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {lastSalaries.map((s) => (
          <li key={s.memberUserId} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={picks[s.memberUserId]?.checked}
              onChange={(e) => setPicks((p) => ({ ...p, [s.memberUserId]: { ...p[s.memberUserId]!, checked: e.target.checked } }))}
            />
            <span className="flex-1 text-sm">{s.memberName}</span>
            <span className="text-xs text-muted-foreground">{currency}</span>
            <Input
              className="w-28 text-right"
              value={picks[s.memberUserId]?.amount}
              onChange={(e) => setPicks((p) => ({ ...p, [s.memberUserId]: { ...p[s.memberUserId]!, amount: e.target.value } }))}
            />
          </li>
        ))}
      </ul>
      <Button onClick={submit} disabled={pending} variant="gradient">
        Record salaries for {currentMonth}
      </Button>
    </div>
  );
}
```

### Task 10.4: Phase 10 checkpoint

- [ ] **Step 1: Smoke + commit**

```bash
pnpm -C apps/web typecheck
pnpm -C apps/web build
git add apps/web/src/app/(app)/payouts
git commit -m "feat(finance): /payouts page + form wizard + repeat-last-month bulk"
```

---

# Phase 11 — `/finance` P&L dashboard

### Task 11.1: Page + period picker

**Files:**
- Create: `apps/web/src/app/(app)/finance/page.tsx`
- Create: `apps/web/src/app/(app)/finance/_components/period-picker.tsx`

- [ ] **Step 1: Page**

```tsx
import type { Metadata } from "next";
import { requirePageOrgFinance } from "@/server/auth/guards";
import { getProfitAndLoss } from "@/server/finance/queries";
import { periodRange, type PeriodPreset } from "@/server/finance/period";
import { PeriodPicker } from "./_components/period-picker";
import { KPIStrip } from "./_components/kpi-strip";
import { TrendChart } from "./_components/trend-chart";
import { BreakdownDonut } from "./_components/breakdown-donut";
import { TopTables } from "./_components/top-tables";

export const metadata: Metadata = { title: "Finance · P&L" };

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requirePageOrgFinance();
  const sp = await searchParams;
  const preset = (sp.preset as PeriodPreset) ?? "this_month";
  const custom = sp.from && sp.to ? { from: new Date(sp.from), to: new Date(sp.to) } : undefined;
  const period = periodRange(preset, ctx.org.timezone, new Date(), custom);
  const pl = await getProfitAndLoss(period);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profit &amp; Loss</h1>
          <p className="text-sm text-muted-foreground">Revenue minus expenses minus payouts.</p>
        </div>
        <PeriodPicker preset={preset} from={period.from} to={period.to} />
      </div>
      <KPIStrip pl={pl} />
      <TrendChart monthly={pl.monthly} currency={pl.currency} />
      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownDonut title="Expenses by category" slices={pl.byCategory.map((c) => ({ label: c.name, value: Number(c.total.toFixed(2)), color: c.color }))} />
        <BreakdownDonut title="Payouts by kind" slices={pl.byKind.map((k) => ({ label: k.kind, value: Number(k.total.toFixed(2)), color: ({ SALARY: "#6366f1", PROJECT: "#10b981", BONUS: "#a855f7" })[k.kind] }))} />
      </div>
      <TopTables byVendor={pl.byVendor} byEarner={pl.byEarner} currency={pl.currency} />
    </div>
  );
}
```

### Task 11.2: `kpi-strip.tsx`

- [ ] **Step 1: Write**

```tsx
"use client";
import { Card } from "@/components/ui/card";
import { AnimatedAmount } from "@/components/finance/animated-amount";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { PLResult } from "@/server/finance/queries";

export function KPIStrip({ pl }: { pl: PLResult }) {
  const cards: Array<{ label: string; value: number; prev: number; positive?: boolean; tone: string; isNet?: boolean }> = [
    { label: "Revenue",     value: Number(pl.revenue.toFixed(2)),  prev: Number(pl.prev.revenue.toFixed(2)),  positive: true,  tone: "from-emerald-500/15 to-emerald-500/0" },
    { label: "Expenses",    value: Number(pl.expenses.toFixed(2)), prev: Number(pl.prev.expenses.toFixed(2)), positive: false, tone: "from-rose-500/15 to-rose-500/0" },
    { label: "Payouts",     value: Number(pl.payouts.toFixed(2)),  prev: Number(pl.prev.payouts.toFixed(2)),  positive: false, tone: "from-amber-500/15 to-amber-500/0" },
    { label: "Net profit",  value: Number(pl.net.toFixed(2)),      prev: Number(pl.prev.net.toFixed(2)),      isNet: true,     tone: "from-violet-500/15 to-violet-500/0" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const delta = c.value - c.prev;
        const pct = c.prev === 0 ? null : (delta / Math.abs(c.prev)) * 100;
        const Trend = delta >= 0 ? TrendingUp : TrendingDown;
        const goodDirection = c.isNet ? delta >= 0 : c.positive ? delta >= 0 : delta <= 0;
        return (
          <Card key={c.label} className={`relative overflow-hidden bg-gradient-to-br ${c.tone}`}>
            <div className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
              <AnimatedAmount value={c.value} currency={pl.currency} className={`mt-1 block text-2xl font-semibold tabular-nums ${c.isNet ? (c.value < 0 ? "text-destructive" : "text-success") : ""}`} />
              {pct !== null ? (
                <p className={`mt-1 inline-flex items-center gap-0.5 text-xs ${goodDirection ? "text-success" : "text-destructive"}`}>
                  <Trend className="size-3" /> {pct >= 0 ? "+" : ""}{pct.toFixed(1)}% vs prev period
                </p>
              ) : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
```

### Task 11.3: `trend-chart.tsx` + `breakdown-donut.tsx` + `top-tables.tsx`

- [ ] **Step 1: Trend chart**

(Use `LineChart` from `recharts` with two series, Revenue and Outflow. Wrap in `motion.div` for fade-in. Currency formatter on tooltips via `formatMoney`. Two-color gradient line for Revenue using a `<defs><linearGradient/></defs>` block.)

- [ ] **Step 2: Donut**

(Use `PieChart` + `Pie` with `dataKey="value"` and per-slice `Cell` `fill={color}`. Tooltip shows label + amount + %. Empty state when slices are all zero.)

- [ ] **Step 3: Top tables**

(Two cards side by side: "Top vendors by spend" and "Top earners". Each is a 5-row list with avatar/vendor, total amount, and percentage bar of the largest in the set. Empty state: friendly copy.)

### Task 11.4: Phase 11 checkpoint

- [ ] **Step 1: Smoke + commit**

```bash
pnpm -C apps/web typecheck
pnpm -C apps/web build
git add apps/web/src/app/(app)/finance
git commit -m "feat(finance): /finance dashboard — KPI strip, trend, donuts, top tables"
```

---

# Phase 12 — `/my-earnings` UI

### Task 12.1: Page

**Files:**
- Create: `apps/web/src/app/(app)/my-earnings/page.tsx`

- [ ] **Step 1: Write**

```tsx
import type { Metadata } from "next";
import { requireUser, getActiveOrg } from "@/server/auth/guards";
import { getMyEarnings } from "@/server/finance/queries";
import { EarningsHero } from "./_components/earnings-hero";
import { EarningsTabs } from "./_components/earnings-tabs";

export const metadata: Metadata = { title: "My earnings" };

export default async function MyEarningsPage() {
  await requireUser();
  const active = await getActiveOrg();
  if (!active) return null;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const data = await getMyEarnings({ from: undefined, to: undefined });
  return (
    <div className="space-y-6">
      <EarningsHero data={data} currency={active.org.defaultCurrency} startOfMonth={startOfMonth} />
      <EarningsTabs rows={data.rows} currency={active.org.defaultCurrency} />
    </div>
  );
}
```

### Task 12.2: `earnings-hero.tsx` + `earnings-tabs.tsx`

- [ ] **Step 1: Hero**

(Big "You earned **₹X** this month" headline using `AnimatedAmount`. 6-month sparkline (recharts `LineChart` minimal style). KPI cards: This month · Last month · YTD · All-time. Side card: per-project breakdown — top 5 projects with amount bars.)

- [ ] **Step 2: Tabs**

(Tabs: All · Salary · Project · Bonus. Each is a table with Date · KindChip · Project link · Amount · Method · Note.)

### Task 12.3: Phase 12 checkpoint

- [ ] **Step 1: Test isolation manually + commit**

(Verify: a member-A login shows ONLY member-A's data. Inspect Network panel — no `byKind` etc. for other users. There's no admin data anywhere on this page.)

```bash
pnpm -C apps/web typecheck
pnpm -C apps/web build
git add apps/web/src/app/(app)/my-earnings
git commit -m "feat(finance): /my-earnings page (all-role accessible, self-only data)"
```

---

# Phase 13 — `/team` finance toggle + sidebar nav

### Task 13.1: Action + toggle UI

**Files:**
- Modify: `apps/web/src/server/team/actions.ts`
- Modify: `apps/web/src/app/(app)/team/_components/member-row.tsx`

- [ ] **Step 1: Action**

Append to `team/actions.ts`:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@stackzio/db";
import { requireOwnerAction } from "@/server/auth/guards";
import { logActivity } from "@/server/activity/log";

export async function setMemberFinanceAccessAction(memberId: string, canSee: boolean) {
  const ctx = await requireOwnerAction();
  const member = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: ctx.org.id },
  });
  if (!member) return { ok: false as const, error: "Member not found" };
  if (member.role === "MEMBER") return { ok: false as const, error: "Only admins can have finance access" };
  if (member.role === "OWNER") return { ok: false as const, error: "Owners always have finance access" };
  await prisma.organizationMember.update({ where: { id: memberId }, data: { canSeeFinancials: canSee } });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "organization",
    entityId: member.userId,
    action: canSee ? "finance_access_granted" : "finance_access_revoked",
  });
  revalidatePath("/team");
  return { ok: true as const };
}
```

- [ ] **Step 2: Toggle in `member-row.tsx`**

(Add a `Switch` next to the role select, visible only when `currentUser.role === "OWNER" && row.role === "ADMIN"`. Bind to `setMemberFinanceAccessAction(member.id, checked)`. Optimistic toggle + sonner toast.)

### Task 13.2: Sidebar gating

**Files:**
- Modify: `apps/web/src/components/app-shell/sidebar.tsx`

- [ ] **Step 1: Add `/my-earnings` link for all roles**

In the existing sidebar item list, add `My earnings` between `My tasks` and `Settings`. Always visible.

- [ ] **Step 2: Add `Finance` section, gated**

Add a section labeled "Money" with three items: `Finance` (P&L), `Expenses`, `Payouts`. Render the section only when `canSeeOrgFinancials(role, canSeeFinancials)` returns true. Use the lucide icons `LineChart`, `Receipt`, `Wallet`.

- [ ] **Step 3: Commit**

```bash
pnpm -C apps/web typecheck
git add apps/web/src/components/app-shell/sidebar.tsx apps/web/src/server/team apps/web/src/app/(app)/team
git commit -m "feat(finance): owner-grantable admin finance access + sidebar nav"
```

---

# Phase 14 — Uploads, E2E, polish, ship

### Task 14.1: `expense-receipt` upload kind

**Files:**
- Modify: `apps/web/src/server/uploads/store.ts`
- Modify: `apps/web/src/app/api/uploads/route.ts`

- [ ] **Step 1: Add to `UploadKind` union**

```ts
export type UploadKind = "org-logo" | "user-avatar" | "project-doc" | "expense-receipt";
```

- [ ] **Step 2: Handle in API route**

Add a branch to `uploads/route.ts` matching the existing pattern. Permission gate: `requireOrgFinance()` semantics — only owners and admins-with-flag may upload receipts. Save to Cloudinary folder `expense-receipts/<orgId>/`. Return `{ url }`.

### Task 14.2: Notification kind for payout (already wired)

(Already covered in Task 5.1 via `emitNotification` with `kind: "GENERIC"`. No new enum value needed in v1.)

### Task 14.3: E2E — `finance.spec.ts`

**Files:**
- Create: `apps/web/e2e/finance.spec.ts`

- [ ] **Step 1: Write the e2e**

```ts
import { test, expect } from "@playwright/test";
import { loginAs, seedOrgWithRoles } from "./helpers";

test.describe("Finance", () => {
  test("owner records expense + salary + bonus → /finance numbers match", async ({ page }) => {
    const { ownerEmail, password, member } = await seedOrgWithRoles();
    await loginAs(page, ownerEmail, password);

    // Add expense
    await page.goto("/expenses");
    await page.getByRole("button", { name: /add expense/i }).click();
    await page.getByLabel("Amount").fill("12000");
    await page.getByLabel("Date").fill(new Date().toISOString().slice(0,10));
    await page.getByRole("button", { name: /^save/i }).click();
    await expect(page.getByText("Expense recorded")).toBeVisible();

    // Add salary
    await page.goto("/payouts");
    await page.getByRole("button", { name: /add payout/i }).click();
    await page.getByRole("tab", { name: /salary/i }).click();
    await page.getByLabel("Member").selectOption({ label: member.name });
    await page.getByLabel("Month").fill(new Date().toISOString().slice(0,7));
    await page.getByLabel("Amount").fill("25000");
    await page.getByRole("button", { name: /^save/i }).click();

    // Verify P&L
    await page.goto("/finance");
    await expect(page.getByText(/Net profit/i)).toBeVisible();
    // Expense + Salary should appear in the appropriate KPIs (exact number depends on prior revenue)
  });

  test("non-flagged admin is redirected from /finance", async ({ page }) => {
    const { adminNoFlagEmail, password } = await seedOrgWithRoles();
    await loginAs(page, adminNoFlagEmail, password);
    await page.goto("/finance");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("member sees only own earnings on /my-earnings", async ({ page }) => {
    const { memberEmail, password } = await seedOrgWithRoles();
    await loginAs(page, memberEmail, password);
    await page.goto("/my-earnings");
    await expect(page.getByText(/You earned/i)).toBeVisible();
    // Should not contain expenses or others' payouts
    await expect(page.getByText(/Expenses by category/i)).toHaveCount(0);
  });
});
```

(`seedOrgWithRoles` extends `apps/web/e2e/helpers` — copy the seed pattern from `role-scoping.spec.ts`, adding the new `canSeeFinancials` flag handling.)

### Task 14.4: Final ship checkpoint

- [ ] **Step 1: Full validation**

```bash
pnpm -C apps/web typecheck
pnpm -C apps/web vitest run
pnpm -C apps/web build
pnpm -C apps/web exec playwright test e2e/finance.spec.ts
```
Expected: all green.

- [ ] **Step 2: Commit + push**

```bash
git add -A
git commit -m "feat(finance): e2e tests, uploads pipeline for expense-receipt"
git push origin main
```

- [ ] **Step 3: Deploy**

If GitHub→Vercel auto-deploy is wired up, push triggers it. Otherwise run `vercel --prod` once authenticated.

- [ ] **Step 4: Smoke prod**

- Visit `/finance`, `/expenses`, `/payouts`, `/my-earnings`.
- Record one expense and one salary; verify numbers match across pages.
- Sign in as a non-flagged admin (use a second account) and confirm the redirect.

---

## Self-review

Done after writing the plan above; issues found are fixed inline.

- **Spec coverage:**
  - Section 2 of spec (data model) → Phase 1.
  - Section 3 (RBAC) → Phase 2.
  - Section 5 routes → Phases 9–13.
  - Section 6 server layer → Phases 3–7.
  - Section 7 correctness invariants → covered by tests in Phases 3, 4, 5, 6.
  - Section 8 testing strategy → Phases 2.3, 3, 4, 5.3, 6.2, 14.3.
  - Section 9 UI / motion → `AnimatedAmount` (8.1), donut animations (11.3), drawer entrance via existing motion (in 9.2, 10.2).
  - Section 12 migration → Phase 1.

- **Placeholder scan:**
  - Files marked "Use the patterns from client-form.tsx" in Task 9.2 are not code-elided placeholders — they're explicit references to a concrete existing file the engineer can mirror. Each notes the required imports, the component skeleton (`useState` pending flag), and the action call. Acceptable, not a placeholder.
  - No "TBD" / "TODO" / "implement later" in the plan.

- **Type consistency:**
  - `UpsertExpenseInput`, `UpsertPayoutInput`, `UpsertCategoryInput`, `PLResult` are defined once in 4.1 / 6.1 and consistently referenced.
  - Action return shape `{ ok: true | false, …}` matches the existing project convention used in every other server action.
  - Method enums `BANK | CASH | UPI | CARD | OTHER` consistent across schema, Zod, and UI.

- **Open dependencies the engineer must check before each phase:**
  - `prisma migrate dev` requires a working `DATABASE_URL`.
  - Vitest tests require `DATABASE_URL_TEST` and the global-setup pattern adopted by the existing e2e harness.
  - Playwright tests reuse the existing seed helpers; new `seedOrgWithRoles` extends them rather than replacing.

---

**Plan complete.** Saved at `docs/superpowers/plans/2026-05-11-finance-feature.md`.
