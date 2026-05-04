# StackZio Manager — Design Spec

**Date:** 2026-05-05
**Status:** Approved (auto-mode)
**Owner:** popuplocals@gmail.com

## 1. Vision

StackZio Manager is a **multi-organization** web app for running one or more agencies/studios from a single account. Each organization (e.g., "StackZio", "VekllumArc") has its own logo, contact details, clients, projects, payments, meetings, and team — fully isolated. One login can belong to multiple organizations and switch between them.

Within an organization: an Owner/Admin and a team of Members manage clients, projects, payments, meetings, and tasks. Admins assign projects to members; members see only what they're assigned to.

The app must feel **modern, fast, and premium** — desktop-first but fully responsive, with light/dark theme, micro-animations, and zero "dummy" non-working UI.

## 2. Goals & Non-Goals

**Goals**
- **Organizations**: create multiple orgs, each with logo, name, description, contact email, phone, address, website. Switch active org from topbar. All data scoped to the active org.
- Manage **Clients** (contacts, business details, docs) per org.
- Manage **Projects** with category (Shopify, Website, Software, …), price, advance, payments, progress %, deadline, assigned members, tasks — per org.
- Track **Revenue**: paid vs outstanding per project, monthly totals, charts — per org.
- Schedule **Meetings** linked to clients/projects with location, agenda, remarks — per org.
- **Role-based access** *within* each org: Owner/Admin sees everything; Member sees assigned projects.
- **Auth**: email+password, Google OAuth, password reset, signup. Secure end-to-end.
- **Per-user settings**: name, avatar, theme preference.
- **Premium UX**: animations, keyboard shortcuts, search, filters, empty states, loading skeletons.
- **Tested**: unit + integration + e2e on critical flows.

**Non-goals (v1)**
- Public marketing site.
- Client-facing portal (clients don't log in).
- Invoicing PDF generation (v2).
- Time tracking (v2).
- Mobile native app (responsive web is enough).
- Cross-org analytics aggregation (v2).

## 3. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Monorepo | **pnpm workspaces + Turborepo** | Fast, conventional, low overhead |
| Frontend | **Next.js 15 (App Router) + React 19 + TypeScript** | User-specified; SSR + RSC + Server Actions |
| Styling | **Tailwind CSS 4 + shadcn/ui (Radix primitives)** | Accessible, customizable, modern |
| Animation | **Framer Motion** | Industry-standard micro-animations |
| Icons | **Lucide React** | Clean, consistent, professional |
| Forms | **react-hook-form + Zod** | Type-safe validation |
| Server state | **TanStack Query** | Caching, optimistic updates |
| Charts | **Recharts** | Composable, themable |
| Tables | **TanStack Table** | Sortable, filterable, performant |
| Backend | **Next.js Route Handlers + Server Actions (Node runtime)** | Single deployable; meets "Node.js backend" |
| Auth | **Auth.js v5 (NextAuth)** with Credentials + Google + Email-reset | Battle-tested, supports all required providers |
| DB | **PostgreSQL** | Best for relational data (clients/projects/payments/users) |
| ORM | **Prisma** | Type-safe queries, migrations |
| File storage | Local `apps/web/public/uploads` (v1) → S3-compatible later | Avatars, project docs |
| Email | Nodemailer (SMTP) for password reset / invites | Configurable |
| Tests | **Vitest** (unit/integration) + **Playwright** (e2e) | Modern, fast |
| Package manager | **pnpm** | Disk-efficient, monorepo-friendly |

**Why a single Next.js app, not separate API service?**
Server Actions + Route Handlers run on Node; they are the backend. Keeping one app keeps types end-to-end, simplifies auth, halves deployment work. The monorepo splits concerns into packages so a separate API can be extracted later without rewrite.

## 4. Monorepo Layout

```
stackzio-manager/
├── apps/
│   └── web/                  Next.js app (frontend + backend)
├── packages/
│   ├── db/                   Prisma schema, migrations, client export
│   ├── ui/                   Shared shadcn-based components
│   ├── lib/                  Shared utilities (formatters, currency, dates)
│   ├── config-eslint/        ESLint preset
│   └── config-tsconfig/      Base tsconfig
├── docs/                     Specs, ADRs
├── Logo/                     Brand assets
├── package.json              Workspace root
├── pnpm-workspace.yaml
├── turbo.json
└── .env.example
```

## 5. Domain Model (Prisma)

```
User { id, email (unique), name, image, passwordHash?, createdAt }
  — User has NO global role. Roles live on OrganizationMember.
Account, Session, VerificationToken — Auth.js

Organization {
  id, slug (unique), name, description?,
  logoUrl?, website?,
  contactEmail?, contactPhone?,
  addressLine1?, addressLine2?, city?, state?, country?, postalCode?,
  defaultCurrency (default INR),
  createdAt, createdById
}
OrgRole enum { OWNER, ADMIN, MEMBER }
OrganizationMember {
  id, organizationId, userId, role: OrgRole, joinedAt
  @@unique([organizationId, userId])
}
OrganizationInvite {
  id, organizationId, email, role, token (unique),
  invitedById, expiresAt, acceptedAt?
}

Client {
  id, organizationId,
  name, company?, email?, phone?, address?, notes?,
  createdAt, createdById
}
ClientContact { id, clientId, name, role?, email?, phone? }

ProjectCategory enum { SHOPIFY, WEBSITE, SOFTWARE, MOBILE_APP, BRANDING, MARKETING, OTHER }
ProjectStatus enum { LEAD, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED }

Project {
  id, organizationId,
  name, description?, category, status,
  clientId, ownerId (the org member responsible),
  priceTotal (decimal), currency (default = org.defaultCurrency),
  startDate?, deadline?, completedAt?,
  progressPct (0-100),
  createdAt, updatedAt
}
ProjectMember { id, projectId, userId, role (LEAD|CONTRIBUTOR), assignedAt }
ProjectDoc { id, projectId, title, url, kind (LINK|FILE), uploadedById }

Payment {
  id, projectId, organizationId,
  amount (decimal),
  kind: ADVANCE|MILESTONE|FINAL,
  paidAt, method (CASH|UPI|BANK|CARD|OTHER),
  reference?, note?
}

Task {
  id, projectId, organizationId,
  title, description?, assigneeId?,
  status (TODO|DOING|DONE),
  dueDate?, completedAt?
}

Meeting {
  id, organizationId,
  title, clientId?, projectId?,
  scheduledAt, durationMin,
  locationKind (ONLINE|CLIENT_LOCATION|OUR_LOCATION),
  locationDetail?, meetingUrl?,
  agenda?, remarks?,
  status (SCHEDULED|DONE|CANCELLED),
  createdById
}
MeetingAttendee { id, meetingId, userId }

ActivityLog {
  id, organizationId, actorId,
  entity, entityId, action, metadata (json),
  createdAt
}
```

**Tenancy invariant**: every scoped table (`Client`, `Project`, `Payment`, `Task`, `Meeting`, `ActivityLog`) carries `organizationId`. Every query filters on it via `requireOrgContext()` helper. Any cross-org reference is a bug.

Computed (not stored): `paidAmount = sum(payments)`, `outstanding = priceTotal - paidAmount`.

## 6. Routes (Next.js App Router)

```
/(auth)
  /login, /register, /forgot-password, /reset-password/[token]
/(onboarding)
  /onboarding/create-organization   — first-run after signup if user has no orgs
/(app)                              — requires session + active org context
  /dashboard                        — KPIs + charts + upcoming meetings + recent activity (scoped to active org)
  /clients                          — list, search, filter
  /clients/new
  /clients/[id]                     — detail + projects + meetings + docs
  /projects                         — list with filters (status, category, member)
  /projects/new
  /projects/[id]                    — overview, tasks, payments, team, docs, activity
  /meetings                         — calendar + list views
  /meetings/new
  /meetings/[id]
  /team                             — admin: invite, role, assignments
  /organization                     — admin: org profile (logo, name, description, contact, address, currency)
  /organization/billing             — placeholder (v2)
  /settings/profile                 — user-level
  /settings/account                 — password, email
  /settings/appearance              — theme
  /settings/organizations           — list orgs user belongs to + create new
/api/auth/[...nextauth]             — Auth.js
/api/uploads                        — avatar / org logo / doc upload
/api/orgs/switch                    — POST { orgId } sets active org cookie
```

Topbar shows an **OrgSwitcher** dropdown (logo + name) — switching sets `stackzio_active_org` httpOnly cookie and refreshes layout.

Server Actions handle mutations; Route Handlers cover OAuth callbacks, uploads, and the org-switch endpoint.

## 7. Auth & Security

- Auth.js v5 with **JWT session strategy** (stateless) + DB adapter for accounts.
- Credentials provider: bcrypt-hashed passwords, min 8 chars, complexity check.
- Google OAuth provider.
- Email-based password reset: signed time-limited token (1h), one-time use, stored in `VerificationToken`.
- All mutating endpoints check session + role. A central `requireAuth(role?)` helper.
- CSRF protection (Auth.js default for credentials).
- Rate-limit login + reset endpoints (in-memory LRU for v1, Redis later).
- Zod validation on every server action input.
- Strict CSP headers + secure cookies (`httpOnly`, `sameSite=lax`, `secure` in prod).
- No secrets in client bundles — only `NEXT_PUBLIC_*` exposed.
- Audit log writes on every mutation (`ActivityLog`).

## 8. Authorization Matrix (within an organization)

| Resource | Owner | Admin | Member |
|---|---|---|---|
| Organization profile / logo / contact | full | full | read |
| Delete organization | yes | no | no |
| Invite / remove members | yes | yes | no |
| Change member roles | yes (incl. demote admins) | yes (cannot demote owner) | no |
| Clients | full CRUD | full CRUD | read all, create/edit own |
| Projects | full CRUD, assign members | full CRUD, assign members | read assigned, edit non-financial fields if assigned |
| Payments | full CRUD | full CRUD | read assigned, no edit |
| Meetings | full CRUD | full CRUD | read assigned, create own |
| Settings (own user profile) | full | full | full |

`requireOrgRole('OWNER' | 'ADMIN' | 'MEMBER')` helper enforces these on the server. Every action also asserts the resource's `organizationId === activeOrgId`.

## 9. Design System

- **Brand colors** from logo:
  - Primary: violet `#7C3AED` (with 50–950 scale)
  - Accent gradient: `linear-gradient(135deg, #7C3AED 0%, #D946EF 50%, #F97316 100%)`
  - Dark text: `#0F172A`
  - Surface light: `#FFFFFF` / `#F8FAFC`
  - Surface dark: `#0B0B12` / `#13131C`
- **Typography**: Inter (body) + Cal Sans / Inter Display (headings).
- **Radius**: 12–16px on cards, 8px on inputs.
- **Shadow**: soft layered shadows; dark mode uses subtle borders instead.
- **Density**: comfortable; 14px base, 16px on inputs.
- **Motion**: 150–250ms; spring on hover lifts; stagger on list items; respect `prefers-reduced-motion`.
- **Layout**: persistent left sidebar (collapsible), top bar with global search (`⌘K`), main content with breadcrumb.
- **Dark/light**: `next-themes` with system default; toggle in topbar + settings.
- **Empty/loading/error states** for every list and detail view — no blank screens.

## 10. Dashboard

- **KPIs (4 cards)**: Revenue this month, Outstanding total, Active projects, Meetings this week.
- **Revenue line chart**: last 6 months paid vs outstanding.
- **Project status donut**: distribution by status.
- **Pipeline table**: top 5 projects by outstanding.
- **Upcoming meetings (next 7 days)**.
- **Recent activity feed** (from `ActivityLog`).

## 11. Testing Strategy (TDD where it matters)

- **Unit** (Vitest): pure utils, Zod schemas, currency math, role checks.
- **Integration** (Vitest + test DB via `pg` container or schema reset): server actions + Prisma queries.
- **E2E** (Playwright): login flow, create client → create project → add payment → see dashboard update; meeting create; admin assigns project; member sees only assigned.
- **Type checks** + **ESLint** + **Prettier** in CI.
- Critical paths get tests *first* (auth, payments, role checks). Pure UI gets visual review + smoke e2e.

## 12. Phased Build

Phase 1 — **Foundation** (this work):
- Monorepo + Next.js + Tailwind + shadcn + theme toggle
- Prisma schema (incl. Organization + OrganizationMember) + initial migration
- Auth.js with credentials + Google + reset
- Onboarding flow: create-organization after signup
- Org switcher in topbar; active-org cookie + middleware
- App shell: sidebar, topbar, command palette stub
- Settings/profile basic; Organization profile page (logo upload, contact details)
- E2E: signup → create org → login → switch org → logout

Phase 2 — **Core CRUD**:
- Clients module (list, detail, contacts)
- Projects module (list, detail, tasks, team assignment, docs)
- Payments module + outstanding computation
- Tables with filters/search

Phase 3 — **Dashboard + Meetings + Polish**:
- Dashboard charts + KPIs + activity feed
- Meetings module (calendar + list)
- Admin team page (invite, role, assignments)
- Animations pass, empty states, keyboard shortcuts
- Full e2e suite

## 13. Subagents

Three project-scoped agents under `.claude/agents/`:

1. **stackzio-coder** — implements features against the spec. Knows the stack and conventions. Writes typed code, server actions with Zod, accessible UI. Always uses Lucide icons, Tailwind tokens, shadcn primitives.
2. **stackzio-reviewer** — reviews diffs for: type safety, security (authz, input validation, secrets), Prisma N+1 issues, accessibility, design-system adherence, dead code, TODO/dummy markers.
3. **stackzio-tester** — writes Vitest + Playwright tests, runs them, reports failures with actionable diffs.

## 14. Env Vars (collected at end)

```
DATABASE_URL=
NEXTAUTH_SECRET=          (auto-generated)
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=         (user provides)
GOOGLE_CLIENT_SECRET=     (user provides)
SMTP_HOST=                (user provides — for password reset emails)
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
```

## 15. Open Decisions (decided here in auto-mode)

- **Currency default**: INR (₹). User-configurable per organization, override per project.
- **Tenancy**: multi-organization. A user can belong to many orgs. Active org chosen via topbar switcher; persisted in httpOnly cookie.
- **Org creation**: any signed-in user can create an organization; the creator becomes its OWNER. New orgs start empty.
- **First-run onboarding**: after signup, user is sent to `/onboarding/create-organization` if they belong to none.
- **File uploads**: local disk with size cap; S3 hook-point exists. Org logos: 2MB cap, square recommended.
- **Email verification on signup**: optional in v1 (configurable); enforced if SMTP configured.

## 16. Definition of Done (per phase)

- All routes return non-blank, real, working content.
- All forms validate, show errors, succeed/fail states.
- All tables: search, filter, pagination, empty state, loading skeleton.
- All mutations write `ActivityLog`.
- Light + dark themes audited for contrast.
- Mobile breakpoint (≥360px) layouts tested.
- Lighthouse ≥ 90 on perf/a11y/best-practices for `/dashboard`.
- Tests green; typecheck green; lint clean.
