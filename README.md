# StackZio Manager

A modern, multi-organization web app to manage clients, projects, payments, meetings, and teams across one or many agencies you run.

> **Status:** Phase 1 — foundation (auth, multi-org, app shell, theme) is in. Phase 2 (clients/projects/payments) and Phase 3 (dashboard charts, meetings, team) are queued.

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Frontend:** Next.js 15 App Router · React 19 · TypeScript · Tailwind CSS · shadcn-style UI · Framer Motion · Lucide
- **Backend (same app):** Next.js Server Actions + Route Handlers (Node)
- **Auth:** Auth.js v5 — Credentials + Google + email-based password reset
- **Database:** PostgreSQL via Prisma 6
- **Tests:** Vitest (unit/integration) + Playwright (e2e)

See [docs/superpowers/specs/2026-05-05-stackzio-manager-design.md](docs/superpowers/specs/2026-05-05-stackzio-manager-design.md) for the full design.

## Layout

```
apps/web              Next.js app (frontend + backend)
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
3. **Start Postgres** (any local Postgres works). Then create the DB:
   ```bash
   createdb stackzio
   createdb stackzio_test
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

## What works today (Phase 1)

- Sign up with email + password (or Google if configured).
- Sign in / sign out.
- Forgot/reset password (logs the link to console if SMTP isn't set).
- Onboarding: create your first organization → become its OWNER.
- Multi-org switcher in the topbar; `stackzio_active_org` cookie scopes data.
- Dashboard with live KPIs (revenue this month, outstanding, active projects, clients).
- Organization profile page (logo URL, contact, address, currency) — Admin/Owner only.
- Settings: profile, account (change password), appearance (theme), organizations list + create.
- Clients / Projects / Payments / Meetings / Team — visible in the sidebar with phase markers; the underlying schema and authorization scaffolding are already in place.

## Env vars you'll need from the user

See `.env.example` for the full list. The minimum to run:

- `DATABASE_URL` — your Postgres connection string.
- `AUTH_SECRET` — generate with `openssl rand -base64 32`.

Optional but recommended:

- `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` — to enable "Continue with Google".
- `SMTP_*` + `EMAIL_FROM` — to actually send password-reset emails.

## Testing

```bash
pnpm typecheck
pnpm test          # vitest across packages
pnpm --filter web e2e   # playwright (Phase 1: auth flows)
```

## Subagents

Three specialized Claude Code agents live in `.claude/agents/`:

- **stackzio-coder** — implements features against the spec.
- **stackzio-reviewer** — audits diffs (security, types, design system, dead code).
- **stackzio-tester** — writes/runs Vitest + Playwright tests.
