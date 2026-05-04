# StackZio Manager

A modern, multi-organization web app to manage clients, projects, payments, meetings, and teams across one or many agencies you run.

> **Status:** All three phases complete — auth + multi-org foundation, full clients/projects/payments/tasks/team/docs CRUD, and dashboard charts + meetings + team-invite + ⌘K + e2e suite.

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Frontend:** Next.js 15 App Router · React 19 · TypeScript · Tailwind CSS · shadcn-style UI · Framer Motion · Lucide
- **Backend (same app):** Next.js Server Actions + Route Handlers (Node)
- **Auth:** Auth.js v5 — Credentials + Google + email-based password reset
- **Database:** PostgreSQL via Prisma 6
- **Charts:** Recharts
- **Tests:** Vitest (unit) + Playwright (e2e)

See [docs/superpowers/specs/2026-05-05-stackzio-manager-design.md](docs/superpowers/specs/2026-05-05-stackzio-manager-design.md) for the full design.

## Layout

```
apps/web              Next.js app (frontend + backend)
apps/web/e2e          Playwright e2e specs
packages/db           Prisma schema + client
packages/lib          Shared utilities (money, date, slug)
packages/config-*     Shared TS / ESLint configs
docs/                 Specs and design docs
.claude/agents/       stackzio-coder, stackzio-reviewer, stackzio-tester subagents
```

## Setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```
2. **Configure environment** — copy `.env.example` to `.env` at the repo root *and* in `apps/web/`, then fill values:
   ```bash
   cp .env.example .env
   cp apps/web/.env.example apps/web/.env
   openssl rand -base64 32   # use this for AUTH_SECRET
   ```
3. **Start Postgres** (any local Postgres works). Then create the DBs:
   ```bash
   createdb stackzio
   createdb stackzio_test    # only needed if you'll run e2e
   ```
4. **Run migrations**
   ```bash
   pnpm db:migrate
   ```
5. **Run the dev server**
   ```bash
   pnpm dev
   ```
   App: <http://localhost:3000>

## What works end-to-end

- **Auth** — email+password + Google OAuth + email-based password reset (single-use, time-limited tokens; logs to console if SMTP isn't set).
- **Multi-org** — onboarding creates your first org with you as Owner; topbar org switcher; `stackzio_active_org` httpOnly cookie scopes every query.
- **Clients** — list w/ search + sort + pagination, full detail (contacts, projects, recent meetings, address, notes), edit, delete (project-safe).
- **Projects** — list w/ search + status + category filters, member-scoped visibility, 5-tab detail (Overview, Tasks, Payments, Team, Docs), edit, delete; member multi-select assignment.
- **Tasks** — inline create/toggle/delete inside project detail; assignee + due date.
- **Payments** — record advance/milestone/final per project with method/date/reference/note; live outstanding %; global ledger.
- **Meetings** — schedule with title, date/time, duration, location (online/client/our), URL, agenda, remarks; attendee picker; status flow Scheduled → Done / Cancelled; group-by-day list with range + status filters.
- **Team** — members + role mgmt with safety guards (always ≥1 owner); pending invites with revoke; **email or copyable link invites** with 7-day single-use tokens; **/invite/[token]** accept page.
- **Dashboard** — live KPIs, Recharts area chart of last-6-months revenue, project status donut, top-5 outstanding, upcoming meetings, humanised activity feed.
- **Settings** — profile (with avatar upload), account (change password), appearance (light/dark/system), organizations list + create.
- **Uploads** — `/api/uploads` for org-logo, user-avatar, project-doc with role checks, MIME whitelist, 4 MB cap.
- **Command palette** — ⌘K (or Ctrl+K) with go-to + create shortcuts, role-aware items.
- **Authorization** — every mutation guarded server-side (`requireAuth`, `requireOrg`, `requireAdmin`, `requireOwner`); Member role correctly scopes to assigned projects only.
- **Activity logging** — every mutation writes a typed log row used by the dashboard feed.

## Environment variables (what to fill in)

| Variable | Required | What to put |
|---|---|---|
| `DATABASE_URL` | **yes** | Postgres connection, e.g. `postgresql://postgres:postgres@localhost:5432/stackzio` |
| `AUTH_SECRET` | **yes** | Run `openssl rand -base64 32` and paste it |
| `AUTH_URL` | yes (in dev) | `http://localhost:3000` |
| `AUTH_TRUST_HOST` | yes (in dev) | `true` |
| `NEXT_PUBLIC_APP_URL` | yes (in dev) | `http://localhost:3000` |
| `AUTH_GOOGLE_ID` | optional | Google Cloud Console OAuth Client ID — enables "Continue with Google" |
| `AUTH_GOOGLE_SECRET` | optional | Google Cloud Console OAuth Client Secret |
| `SMTP_HOST` | optional | SMTP server (Resend, Mailtrap, Gmail+app password, etc.) |
| `SMTP_PORT` | optional | Usually `587` (or `465` for TLS) |
| `SMTP_USER` | optional | SMTP username |
| `SMTP_PASS` | optional | SMTP password / app password |
| `EMAIL_FROM` | optional | Sender, e.g. `StackZio <no-reply@your-domain>` |
| `DATABASE_URL_TEST` | only for e2e | A second Postgres DB, e.g. `postgresql://postgres:postgres@localhost:5432/stackzio_test` |

If SMTP isn't configured, password-reset and team-invite links print to your dev console instead of being emailed.

### Setting up Google OAuth

1. <https://console.cloud.google.com/apis/credentials> → "Create Credentials" → "OAuth client ID" → Web application.
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (and your production URL when deploying).
3. Copy the Client ID and Client Secret into `.env`.

## Verifying

```bash
pnpm typecheck                    # all packages
pnpm test                         # vitest unit tests (43/43)
pnpm --filter web build           # production build (32 routes)
```

## End-to-end tests

E2E uses a **separate test database** so it can reset between runs without touching your data.

```bash
# 1. Make sure DATABASE_URL_TEST is set in your env (see table above)
# 2. Install Chromium for Playwright (once)
pnpm e2e:install
# 3. Run the suite
pnpm e2e
```

Specs cover:
- Auth: signup → onboarding → dashboard → logout → login; bad password rejection
- Client → project → payment flow; dashboard reflects revenue
- Meetings: schedule → see in list and dashboard; mark done
- Team invite: admin invites → recipient signs up → accepts → joins org; email-mismatch is rejected
- Theme persists across reload
- Multi-org: data isolation between two orgs the same user owns
- Role scoping: MEMBER sees only assigned projects, no admin links

## Subagents

Three specialized Claude Code agents live in `.claude/agents/`:

- **stackzio-coder** — implements features against the spec.
- **stackzio-reviewer** — audits diffs (security, types, design system, dead code).
- **stackzio-tester** — writes/runs Vitest + Playwright tests.
