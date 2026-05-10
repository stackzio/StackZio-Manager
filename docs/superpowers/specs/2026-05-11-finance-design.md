# StackZio Manager — Finance feature design

**Date:** 2026-05-11
**Scope:** Expenses, team payouts, profit-and-loss dashboard, per-member earnings page, owner-grantable admin finance access.
**Status:** Approved by user; ready for implementation plan.

---

## 1. Problem & goals

The current system tracks **revenue only** (`Payment` rows from clients per project). The user runs an agency: real net profit requires also tracking outflow — ad spend, influencer payments, software, rent, etc., and what they pay each team member (monthly salary or per-project).

Goals:

1. Record outbound money (expenses + team payouts) with the same fidelity as inbound payments.
2. Show a profit-and-loss view for any period: revenue − expenses − payouts.
3. Every team member sees a personal `My earnings` page — their own payouts only, no leakage of org totals.
4. Owners can per-admin grant access to the org-wide finance view.
5. All numeric calculations must be exact (Decimal-correct), match across every chart, KPI, and table, and survive timezone boundaries.

Non-goals (explicitly YAGNI for v1):
- Per-project P&L (user chose org-level expenses only).
- Recurring auto-generation of monthly salary entries (manual + "repeat last month" button instead).
- Multi-currency expenses (org default currency only).
- Approval workflows / pending vs paid states.
- Reimbursable-expense workflow (members submitting receipts to admins).

---

## 2. Data model

New tables, additive only — no destructive migrations to existing models.

### 2.1 `ExpenseCategory`

```
id              String   @id @default(cuid())
organizationId  String
name            String         // e.g. "Ads"
color           String         // hex, e.g. "#a855f7"
icon            String         // lucide icon name, e.g. "Megaphone"
isSystem        Boolean  @default(false)
createdAt       DateTime @default(now())

@@unique([organizationId, name])
@@index([organizationId])
```

On `Organization` create — wherever `createOrganizationAction` currently runs — also call `seedSystemExpenseCategories(orgId)`. The seven rows:

| name        | color    | icon            |
| ----------- | -------- | --------------- |
| Ads         | #ec4899  | Megaphone       |
| Influencer  | #a855f7  | Users           |
| Marketing   | #6366f1  | Sparkles        |
| Software    | #06b6d4  | Code2           |
| Rent        | #f59e0b  | Building2       |
| Travel      | #10b981  | Plane           |
| Other       | #71717a  | Tag             |

System rows have `isSystem=true` and can be renamed/recoloured but not deleted (delete attempts return an error). Custom rows can be fully edited and deleted; deletion is blocked if any `Expense` still references them (force user to migrate first).

### 2.2 `Expense`

```
id              String   @id @default(cuid())
organizationId  String
categoryId      String
vendor          String?         // free-text, e.g. "Meta", "Acme Studios"
amount          Decimal  @db.Decimal(14, 2)
currency        String          // org default at creation time, locked thereafter
spentAt         DateTime        // date the cost was incurred
method          ExpenseMethod   @default(BANK)
reference       String?         // invoice/transaction id
note            String?
receiptUrl      String?         // Cloudinary URL via uploads pipeline, kind=expense-receipt
createdById     String
createdAt       DateTime @default(now())

@@index([organizationId, spentAt])
@@index([categoryId])
```

`enum ExpenseMethod { BANK CASH UPI CARD OTHER }` — separate from `PaymentMethod` so the two can evolve independently.

### 2.3 `Payout`

```
id              String   @id @default(cuid())
organizationId  String
memberUserId    String          // FK → User.id
kind            PayoutKind      // SALARY | PROJECT | BONUS
amount          Decimal  @db.Decimal(14, 2)
currency        String          // org default at creation time
projectId       String?         // REQUIRED iff kind=PROJECT
periodMonth     DateTime?       // REQUIRED iff kind=SALARY — first day of month, 00:00 UTC
paidAt          DateTime
method          PayoutMethod    @default(BANK)
reference       String?
note            String?
createdById     String
createdAt       DateTime @default(now())

@@index([organizationId, paidAt])
@@index([memberUserId, paidAt])
@@index([projectId])
```

`enum PayoutKind { SALARY PROJECT BONUS }`
`enum PayoutMethod { BANK CASH UPI CARD OTHER }`

Invariants are validated in the Zod schema and asserted before the Prisma write (Prisma 6.x doesn't expose CHECK constraints in `schema.prisma`; the partial unique index on SALARY is the one DB-level guard):

- `kind=PROJECT` → `projectId` non-null, `periodMonth` null.
- `kind=SALARY` → `periodMonth` non-null (first of month), `projectId` null. **Unique** per `(organizationId, memberUserId, periodMonth)` — enforced by a partial unique index added in migration SQL.
- `kind=BONUS` → both `projectId` and `periodMonth` null.

### 2.4 `OrganizationMember` change

```
+ canSeeFinancials Boolean @default(false)
```

- Owners: the field is ignored — they always see org finance.
- Admins: default `false`. Owner toggles per admin row on `/team`.
- Members: field is irrelevant — they only see `/my-earnings`.

---

## 3. Authorization

`server/auth/guards.ts` evolves. Current single helper `canSeeFinancials(role)` collides two concepts; split them.

```ts
// Project-level financials: prices, payments, client info on projects.
// Unchanged behavior — admins always see these.
export function canSeeProjectFinancials(role: OrgRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

// Org-level financials: P&L dashboard, all expenses, all payouts to others.
// Per-admin grant, default off.
export function canSeeOrgFinancials(
  role: OrgRole,
  canSeeFinancials: boolean,
): boolean {
  return role === "OWNER" || (role === "ADMIN" && canSeeFinancials);
}

// Manage expenses / others' payouts. Same gate as canSeeOrgFinancials —
// if you can't see the totals, you can't write rows that affect them.
export function canManageOrgFinancials(
  role: OrgRole,
  canSeeFinancials: boolean,
): boolean {
  return canSeeOrgFinancials(role, canSeeFinancials);
}

// Toggle the canSeeFinancials flag on someone else.
// Owner only — admins can't promote each other.
export function canGrantFinanceAccess(role: OrgRole): boolean {
  return role === "OWNER";
}
```

`requireOrg()` already returns `role`. It will also return `canSeeFinancials` (read off the member row at the same query). All `/finance`, `/expenses`, `/payouts` server pages call a new `requireOrgFinance()` helper that throws/redirects when `canSeeOrgFinancials` is false. `/my-earnings` is open to every authenticated org member.

**Existing places that called `canSeeFinancials(role)`** (search shows ~10 callsites in projects/clients/dashboard) all map to `canSeeProjectFinancials(role)` (unchanged semantics) — confirmed via grep before refactor. The rename is a 1:1 swap; no behavioral change to existing pages.

---

## 4. Routes & permissions

| Route                         | OWNER | ADMIN+flag | ADMIN−flag | MEMBER |
| ----------------------------- | ----- | ---------- | ---------- | ------ |
| `/finance` (P&L dashboard)    | ✅    | ✅         | ❌         | ❌     |
| `/expenses`                   | ✅    | ✅         | ❌         | ❌     |
| `/expenses/categories`        | ✅    | ✅         | ❌         | ❌     |
| `/payouts`                    | ✅    | ✅         | ❌         | ❌     |
| `/my-earnings`                | ✅    | ✅         | ✅         | ✅     |
| `/team` row → "Finance access"| ✅    | ❌         | ❌         | ❌     |

Sidebar shows `/finance` and the Money group only when `canSeeOrgFinancials` is true. `My earnings` shows for every authenticated user (mirroring `/my-tasks`).

---

## 5. UI structure

### 5.1 `/finance` — P&L dashboard

- **Period selector** (top right): This month · Last month · Last 3 months · This year · Custom range. Stored in URL search params (`?from=…&to=…`) so the view is shareable/bookmarkable.
- **KPI strip** — 4 cards: Revenue · Expenses · Payouts · **Net Profit** (green if ≥ 0, red if < 0). Each shows the absolute value, delta vs the previous equal-length period (% and ↑/↓), and an animated count-up on mount/period change.
- **Trend** — line chart, last 12 months, two series: Revenue (gradient line) vs Outflow (Expenses + Payouts, dashed line). Recharts; framer-motion fade-in.
- **Two donuts** — Expenses by category · Payouts by kind.
- **Two tables** — Top vendors by spend · Top earners (members) for the period. Each row is a link into the filtered list view.

### 5.2 `/expenses`

- **Filter bar**: category multiselect, vendor search, date range. Server-paginated (default 50/page, sortable by spentAt desc / amount).
- **Table columns**: Date · Category chip · Vendor · Amount · Method · Note (truncated). Row click opens an edit drawer.
- **Add expense** — primary CTA top right, opens a side drawer (mobile: full-screen sheet). Receipt upload via existing Cloudinary pipeline with a new `kind=expense-receipt`.
- **Empty state** — gradient illustration + "Add your first expense" CTA.

### 5.3 `/expenses/categories`

- Two sections: **Built-in** (system, readonly name/icon, color editable) and **Custom** (full CRUD).
- Add custom: name + color picker (hex swatches + custom) + icon picker (curated lucide subset).
- Delete blocked with a clear "This category is used by N expenses — reassign them first" error.

### 5.4 `/payouts`

- **Filter bar**: member, kind, project, date range.
- **Table columns**: Date · Member avatar+name · Kind chip · Project (if any) · Amount · Method.
- **Add payout** — wizard with three tabs in the drawer:
  - **Salary**: member select · month picker (defaults to current month, validates uniqueness against the partial index) · amount · method/reference/note.
  - **Project**: member select · project select · amount · method/reference/note.
  - **Bonus**: member select · amount · reason (free-text → note) · method.
- **Bulk action**: "Repeat last month's salaries" button. Pulls every SALARY payout from the previous month, lets the user uncheck members / tweak amounts, creates one row per checked member for the current month in a single transaction.

### 5.5 `/my-earnings`

Available to every role. Reads `Payout` rows where `memberUserId = currentUser.id`.

- **Hero**: "You earned **₹X** in <Month>" with a 6-month sparkline. Green pulse if amount > 0 this month.
- **KPI cards**: This month · Last month · YTD · All-time.
- **Tabs**: All · Salary · Project · Bonus.
- **Table**: Date · Kind chip · Project (if any, linkable) · Amount · Method · Note.
- **Right column**: per-project earnings list (top 5 projects by total) + monthly summary cards (last 6 months).
- **No org totals anywhere on this page** — assert in test.

### 5.6 `/team` row change

Adds a "Finance access" toggle column visible only to the owner. Toggling fires `setMemberFinanceAccessAction(memberId, granted)` → updates `OrganizationMember.canSeeFinancials` and logs activity.

---

## 6. Server layer

```
server/finance/
  schemas.ts          # Zod schemas (UpsertExpenseInput, UpsertPayoutInput, period query)
  queries.ts          # getExpenses, getPayouts, getMyEarnings, getProfitAndLoss
  expense-actions.ts  # create/update/delete expense, category CRUD
  payout-actions.ts   # create/update/delete payout, repeat-last-month bulk
  pl.ts               # pure period-aware P&L computation, fully unit-tested
  rbac.ts             # requireOrgFinance() helper, used by /finance/* pages
```

All queries are `React.cache()` per request when used by server components (matches existing pattern in `server/dashboard/queries.ts`).

### 6.1 `getProfitAndLoss(period)`

```ts
async function getProfitAndLoss({ from, to }: PeriodRange) {
  const orgId = (await requireOrg()).org.id;
  const [revenueAgg, expenseAgg, payoutAgg, byCategory, byKind, byVendor, byEarner] =
    await Promise.all([
      prisma.payment.aggregate({ where: { organizationId: orgId, paidAt: { gte: from, lte: to } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { organizationId: orgId, spentAt: { gte: from, lte: to } }, _sum: { amount: true } }),
      prisma.payout.aggregate({ where: { organizationId: orgId, paidAt: { gte: from, lte: to } }, _sum: { amount: true } }),
      prisma.expense.groupBy({ by: ["categoryId"], where: { ... }, _sum: { amount: true } }),
      prisma.payout.groupBy({ by: ["kind"], where: { ... }, _sum: { amount: true } }),
      prisma.expense.groupBy({ by: ["vendor"], where: { ... }, _sum: { amount: true }, orderBy: { _sum: { amount: "desc" } }, take: 5 }),
      prisma.payout.groupBy({ by: ["memberUserId"], where: { ... }, _sum: { amount: true }, orderBy: { _sum: { amount: "desc" } }, take: 5 }),
    ]);
  // Decimal math via .toFixed(2) only at boundary
  const revenue = new Decimal(revenueAgg._sum.amount ?? 0);
  const expenses = new Decimal(expenseAgg._sum.amount ?? 0);
  const payouts = new Decimal(payoutAgg._sum.amount ?? 0);
  const net = revenue.minus(expenses).minus(payouts);
  return { revenue, expenses, payouts, net, byCategory, byKind, byVendor, byEarner, period: { from, to } };
}
```

All sums use Prisma's Decimal type end-to-end. UI conversion to string happens at render via `formatMoney`.

### 6.2 Period boundary computation

`server/finance/period.ts` exports `periodRange(preset, orgTimezone)` → `{ from: Date, to: Date }` in UTC. Org timezone is added to `Organization` (`timezone String @default("UTC")`). Boundaries computed via `Intl.DateTimeFormat` with the org's IANA zone, then converted to UTC for the Prisma query. Unit-tested across DST transitions, leap day, and Asia/Kolkata (the user's likely default).

### 6.3 Activity log integration

Every create/edit/delete on Expense and Payout calls `logActivity(...)` with appropriate `entity` + `action`. Activity feed gets new icons + tones for `expense_*` and `payout_*`.

### 6.4 Notifications

- Member gets a `GENERIC` notification when a payout is recorded for them, with the kind, amount, and a link to `/my-earnings`.

(No owner-side notification for blocked admin access in v1 — the redirect is sufficient signal; can revisit if abuse appears.)

---

## 7. Correctness invariants (must hold)

These are asserted in unit tests:

1. **Decimal math only** — `Decimal(0.1).plus(0.2).toFixed(2) === "0.30"`. No JS-number arithmetic on amounts anywhere.
2. **Net Profit = Revenue − Expenses − Payouts** within the same period window. Cross-check: KPI net must equal `byCategory.sum - byKind.sum` flips don't introduce drift.
3. **Period boundaries inclusive on both ends** — an expense at `spentAt = to` is included; at `to + 1ms` excluded. Document this clearly.
4. **Timezone-aware** — "This month" for an Asia/Kolkata org includes 2026-05-01 00:00 IST → 2026-06-01 00:00 IST. Stored as UTC.
5. **Salary uniqueness** — partial unique index on `(organizationId, memberUserId, periodMonth) WHERE kind = 'SALARY'`. Attempt to insert duplicate returns "Salary for <member> in <month> already recorded".
6. **Currency lock** — once an expense or payout is created, currency cannot be edited; org default currency change does not retroactively modify rows.
7. **Member self-only on `/my-earnings`** — queries always filter `where: { memberUserId: currentUser.id }`. Tested by creating two members and asserting B never sees A's data.

---

## 8. Testing strategy

### 8.1 Unit (Vitest)

- `pl.ts`: P&L math across periods, edge amounts, negative net, empty data.
- `period.ts`: month boundaries across DST, year boundaries, custom ranges, invalid input.
- `rbac.ts`: matrix of role × canSeeFinancials × route → expected allowed/denied.
- Decimal helpers: 0.1 + 0.2, large numbers (10⁹), negative subtractions.

### 8.2 Integration (Vitest + Prisma test DB)

- `createExpenseAction` with valid + invalid Zod input → row created or 400.
- `createPayoutAction` for each kind → invariant validation (project required for PROJECT, periodMonth required for SALARY, uniqueness for duplicate salary).
- `getProfitAndLoss` with seeded fixtures: 3 payments + 4 expenses + 2 payouts → math matches hand-calculation.
- `getMyEarnings` filter: member A's earnings exclude member B's payouts.
- Authorization: admin without flag → 403 on `/finance`, `/expenses`, `/payouts`; allowed on `/my-earnings`.

### 8.3 E2E (Playwright)

- Owner records 1 expense + 1 salary + 1 bonus → `/finance` totals reflect each. KPI strip math is internally consistent.
- Owner promotes admin → grants finance access → admin sees `/finance`. Owner revokes → admin redirected on next nav.
- Member logs in → `/my-earnings` shows only their rows. Direct nav to `/finance` redirects to `/dashboard` with an error toast.
- "Repeat last month's salaries" creates correct rows in one transaction; partial failure (e.g. duplicate) rolls back.

### 8.4 Visual / interaction

- KPI count-up animates on period change.
- Donut transitions smoothly when filters change.
- Drawer keyboard focus traps and Esc closes (a11y).

---

## 9. UI / motion details

- KPI count-up via `framer-motion`'s `animate(prev, next)` springs (250ms).
- Charts use recharts with framer-motion wrapping for staggered entrance.
- Drawer entry uses existing motion primitives in the codebase.
- Empty states use the brand gradient with a subtle aurora blur (`-z-10` blur-3xl) — visual identity matches the existing dashboard hero.
- All currency renderings use `formatMoney(value, currency)` — never raw `toString()` on Decimal.

---

## 10. Open answers / locked-in choices

(Recorded from brainstorming session, no further input needed.)

| Question | Choice |
| -------- | ------ |
| Team payout model | Both monthly salary + per-project + bonus |
| Project linkage on expenses | Org-level only (no project link) |
| Categories | Built-in defaults + custom per org |
| Default admin finance access | Hidden by default; owner explicitly grants |
| Non-flagged admins creating expenses/payouts | Not allowed — same gate as viewing |
| Receipt upload pipeline | Existing Cloudinary uploads with new `kind=expense-receipt` |
| Member route name | `/my-earnings` |
| Ship as one feature or phased | One bundled feature, one branch, one merge |

---

## 11. Out of scope (v1)

- Recurring auto-creation of salary entries (use "Repeat last month" instead).
- Approval / pending vs paid workflow.
- Multi-currency expenses (org default only).
- Per-project P&L (because expenses are org-level).
- Mobile app deep-links into specific finance rows.
- Bank/UPI/CSV import.
- Export to PDF / Excel (could add later as a 1-day follow-up).

---

## 12. Migration & rollout

Single Prisma migration:

1. Create enums `ExpenseMethod`, `PayoutMethod`, `PayoutKind`.
2. Create tables `ExpenseCategory`, `Expense`, `Payout`.
3. Add column `OrganizationMember.canSeeFinancials BOOLEAN NOT NULL DEFAULT false`.
4. Add column `Organization.timezone TEXT NOT NULL DEFAULT 'UTC'`.
5. Add partial unique index `payout_unique_salary_per_month`:
   ```sql
   CREATE UNIQUE INDEX payout_unique_salary_per_month
   ON "Payout" ("organizationId", "memberUserId", "periodMonth")
   WHERE "kind" = 'SALARY';
   ```
6. Backfill: seed 7 system categories for every existing organization.

No destructive changes. Rollback = drop the new tables + the new column; existing functionality unaffected.
