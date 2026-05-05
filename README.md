# Kino

## About

Kino is a **spend management** workspace for people who want their financial picture to be both **accountable and human**. Money has two faces: the **objective** one—balances, inflows and outflows, categories, sync with banks, and the math that has to add up—and the **subjective** one—what a purchase meant, which goals mattered this month, how tradeoffs felt, and how your priorities evolve. Most tools optimize for the first and treat the second as an afterthought. Kino is built to hold **both** without collapsing them into each other.

The app is organized around **seeing finance over time**. Trends, comparisons, and long-running context matter as much as individual transactions: you’re not only asking “what did I spend?” but “how is my spending *moving*—relative to income, obligations, and the story I’m trying to tell with my money?” Charts, reports, and time-based views are first-class so patterns surface before they become surprises.

Under the hood it is a modern web application (Next.js + Supabase) with wallets, transactions, labels, bills, optional bank linking, and automation—see below for setup and architecture.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Local Supabase](#local-supabase)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Database & migrations](#database--migrations)
- [API routes & automation](#api-routes--automation)
- [Testing](#testing)
- [CI/CD](#cicd)
- [Deployment](#deployment)
- [Security](#security)
- [Contributing](#contributing)

---

## Features

- **Authentication** — Email/password via Supabase Auth; protected `/app` routes; sign-in, sign-up, password reset.
- **Wallets & workspaces** — Multi-wallet layout, workspace membership, roles, and shared configuration.
- **Transactions** — Listing, filtering, tags, categories, labels, transfers, templates, and recurring patterns.
- **Plaid** — Link accounts, sync transactions, encrypted token storage, and server-side Plaid APIs.
- **Bills & cashflow** — Bills, recurrent bills, reminders (SMS via Twilio when configured), and reporting views.
- **Visualization & analysis** — Infographics, forecasts, currency conversions, and views designed to read money across time.
- **Google Calendar** — Optional visualization of time spent per calendar (OAuth-related env vars).
- **AI assistant** — Finance chat API route backed by OpenAI when `OPENAI_API_KEY` is set.
- **Settings** — Categories, tags, labels, views, assets, integrations, preferences, members, and more.

For engineering conventions (imports, lint, PR expectations), see [`AGENTS.md`](./AGENTS.md).

---

## Tech stack

| Area | Choice |
|------|--------|
| Framework | Next.js 16 (App Router), React 18 |
| Language | TypeScript (strict) |
| UI | Tailwind CSS 4, Radix, shadcn-style components |
| Data & auth | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| Forms & validation | react-hook-form, Zod |
| Server state / cache | TanStack Query (+ persistence helpers) |
| Charts & tables | Recharts, TanStack Table, TanStack Virtual |
| Banking | Plaid (`plaid`, `react-plaid-link`) |
| Tests | Vitest (`*.test.ts`, `__tests__/**/*.ts`) |

Request interception uses Next’s **`proxy`** entry ([`proxy.ts`](./proxy.ts)) with the Supabase session helper in [`utils/supabase/middleware.ts`](./utils/supabase/middleware.ts).

---

## Prerequisites

- **Node.js** 20.x (aligned with `@types/node` in this repo)
- **npm** (scripts in `package.json` use npm; the repo may also contain other lockfiles—pick one package manager and stay consistent)
- **Supabase CLI** — for local stack and linked type generation (`supabase` on your `PATH`)
- Accounts/keys as needed: **Supabase**, **Plaid** (if using banking), **OpenAI** (if using finance chat), **Twilio** (if using bill SMS), **Google Cloud** (if using Calendar), and a **currency** API token if you enable conversion fetches

---

## Getting started

1. **Clone** the repository and install dependencies:

   ```bash
   npm install
   ```

2. **Configure environment** — Copy the example file and fill in values:

   ```bash
   cp .env.example .env.local
   ```

   `.env.example` documents the minimum; the [Environment variables](#environment-variables) section lists additional variables used across the app.

3. **Run the dev server**:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Unauthenticated users hitting `/` are redirected to sign-in; authenticated users are redirected toward `/app` (see middleware helper above).

4. **Verify** — Run lint (and tests if you touch tested modules):

   ```bash
   npm run lint
   npm run test:run
   ```

---

## Environment variables

Store secrets in **`.env.local`** (gitignored). Never commit real keys.

### Core (required for auth & data)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous (public) key |

### Server / admin

| Variable | Purpose |
|----------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for trusted server scripts and admin Supabase client usage |

### Plaid

| Variable | Purpose |
|----------|---------|
| `PLAID_CLIENT_ID` | Plaid application client ID |
| `PLAID_SECRET` | Plaid secret |
| `PLAID_ENV` | e.g. `sandbox` or `production` (see [`utils/plaid/server.ts`](./utils/plaid/server.ts)) |
| `PLAID_TOKEN_ENCRYPTION_KEY` | Key used to encrypt stored Plaid tokens (32-byte value; base64 recommended in `.env.example`) |

### Google Calendar (optional)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | OAuth client ID |
| `NEXT_PUBLIC_GOOGLE_API_KEY` | API key for client-side Calendar usage |

### Currency (optional)

| Variable | Purpose |
|----------|---------|
| `CURRENCY_API_TOKEN` | Token for the currency conversion provider used in [`utils/fetch-conversions-server.ts`](./utils/fetch-conversions-server.ts) |

### OpenAI (optional — finance chat)

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | API key for [`app/api/ai/finance-chat/route.ts`](./app/api/ai/finance-chat/route.ts) |
| `OPENAI_FINANCE_MODEL` or `OPENAI_MODEL` | Model override (defaults exist in code) |

### Transfer categories (UUIDs from your database)

These wire default transfer behavior to specific category rows:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_TRANSFER_CATEGORY_IN_ID` | “Transfer in” category |
| `NEXT_PUBLIC_TRANSFER_CATEGORY_OUT_ID` | “Transfer out” category |
| `NEXT_PUBLIC_TRANSFER_CATEGORY_BETWEEN_ID` | “Between wallets” category |
| `TRANSFER_CATEGORY_BETWEEN_ID` | Server-side companion used in some actions (see [`actions/link-transfers.ts`](./actions/link-transfers.ts)) |

### Cron & SMS

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Bearer token expected by cron route handlers |
| `TWILIO_ACCOUNT_SID` | Twilio account SID (bill reminders) |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_FROM_NUMBER` | Sender number |

### Optional / platform

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_VERSION` | Cache-busting / versioning (see [`utils/query-cache.ts`](./utils/query-cache.ts)) |
| `VERCEL_URL` | Set automatically on Vercel; used for metadata base URL in [`app/layout.tsx`](./app/layout.tsx) |

---

## Local Supabase

Start the local stack when you need Postgres, Auth, or to run migrations against a dev instance:

```bash
npm run supabase:start
# ...
npm run supabase:stop
```

After schema changes, add SQL under [`supabase/migrations/`](./supabase/migrations/) and regenerate TypeScript types for the client:

```bash
npm run supabase:types
```

Output is written to [`utils/supabase/database.types.ts`](./utils/supabase/database.types.ts) (per `package.json` script; requires a **linked** Supabase project).

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js development server (default port 3000) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint (Next + import sorting + unused imports) |
| `npm run test` | Vitest watch mode |
| `npm run test:run` | Vitest single run (CI-friendly) |
| `npm run supabase:start` / `supabase:stop` | Local Supabase lifecycle |
| `npm run supabase:types` | Generate DB types into `utils/supabase/database.types.ts` |
| `npm run reconcile-bills` | [`scripts/reconcile-bills.ts`](./scripts/reconcile-bills.ts) (needs service role env) |
| `npm run verify-csv-balance` | [`scripts/verify-csv-balance.ts`](./scripts/verify-csv-balance.ts) |

Root-level helper scripts may live beside `package.json`; see [`AGENTS.md`](./AGENTS.md) for conventions.

---

## Project structure

```
app/           # App Router: pages, layouts, route handlers, assets
components/    # Shared UI (shadcn/Radix/Tailwind)
actions/       # Server actions
hooks/         # React hooks
contexts/      # React contexts
lib/           # Shared libraries
utils/         # Utilities (Supabase clients, Plaid, conversions, etc.)
supabase/      # Config, migrations, local settings
public/        # Static assets
docs/          # Additional documentation
scripts/       # Maintenance scripts (ts-node)
```

Path alias **`@/`** maps to the repository root (see `tsconfig.json` and Vitest config).

---

## Database & migrations

- SQL migrations live in [`supabase/migrations/`](./supabase/migrations/) and are applied in order.
- RLS policies, views, RPCs, and wallet/transaction/bill models evolve through these files.
- After pulling migration changes, apply them to your environment (local `supabase db` workflow or hosted project) and **regenerate types** so TypeScript stays in sync.

---

## API routes & automation

Notable App Router handlers under [`app/api/`](./app/api/):

- **`/api/plaid/*`** — Link token, connect, exchange, transactions, preview, connection management
- **`/api/cron/*`** — Scheduled jobs (`daily-tasks`, `monthly-backfill`, `bill-reminders`) — protect with `CRON_SECRET`
- **`/api/ai/finance-chat`** — OpenAI-backed chat
- **`/api/currency-conversions`**, **`/api/forecast`**, **`/api/run-recurring`** — Supporting finance features

Configure your scheduler (e.g. Vercel Cron) to call these endpoints with the correct `Authorization: Bearer <CRON_SECRET>` header where implemented.

---

## Testing

- **Runner**: Vitest ([`vitest.config.mjs`](./vitest.config.mjs))
- **Patterns**: `**/*.test.ts`, `**/__tests__/**/*.ts`
- **Environment**: Node (no DOM by default)

When adding tests, prefer colocated `*.test.ts` files and mock Supabase or network I/O; document required env vars in the test description.

---

## CI/CD

[`.github/workflows/production.yml`](./github/workflows/production.yml) runs on pushes to `main` (and manual dispatch):

- Checks out the repo
- Uses **Supabase CLI** with repository secrets: `SUPABASE_ACCESS_TOKEN`, `PRODUCTION_DB_PASSWORD`, `PRODUCTION_PROJECT_ID`
- Runs `supabase link`, `supabase db push`, and `supabase functions deploy`

Ensure GitHub Actions secrets are configured before relying on this pipeline.

---

## Deployment

- **Vercel** is the natural host for Next.js; set the same environment variables as production (see [Environment variables](#environment-variables)).
- **Supabase** hosts Postgres, Auth, and related services; keep anon and service role keys scoped correctly (service role only on the server).
- This repo’s `next.config.js` enables the **React Compiler** and treats **`arima`** as an external server package (forecasting).

---

## Security

- Do **not** commit `.env`, `.env.local`, or `*.pem` (see [`.gitignore`](./.gitignore)).
- **Service role** keys bypass RLS—use only in server code and scripts, never in client bundles.
- **Cron** routes should reject requests without the shared secret.
- Rotate keys if they are ever exposed; review Supabase RLS when adding tables or views.

---

## Contributing

- Follow [`AGENTS.md`](./AGENTS.md) for structure, linting, imports, and PR expectations.
- Use short, present-tense commit messages and keep changes focused.
- Call out migrations, env var additions, and `npm run supabase:types` updates in PR descriptions.

---

## Acknowledgments

Kino builds on common **Next.js + Supabase** patterns (SSR client, cookie-based sessions). Useful references: [Supabase + Next.js](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs), [Next.js App Router](https://nextjs.org/docs/app).
