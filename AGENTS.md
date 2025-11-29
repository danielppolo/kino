# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages, layouts, providers, and route handlers plus app assets (icons, manifests, fonts).
- `components/`: Reusable UI built on shadcn/ui, Radix, and Tailwind; keep shared primitives here, not inside page dirs.
- `actions/`, `hooks/`, `contexts/`, `lib/`, `utils/`: Server actions, hooks, contexts, helpers, and utilities; prefer the `@/` import alias.
- `supabase/`: Local Supabase config, migrations, functions, and seeds; update with schema changes and regenerate types.
- `public/`: Static assets; avoid committing large media. `docs/` and root scripts (`extract_*.rb`, `test-label-chart.js`) support tooling.

## Build, Test, and Development Commands
- `npm run dev`: Start the Next.js dev server (`localhost:3000`).
- `npm run lint`: ESLint with simple-import-sort and unused-imports rules.
- `npm run build` / `npm run start`: Production build and serve.
- `npm run supabase:start` / `npm run supabase:stop`: Manage local Supabase (requires CLI); start before DB-touching flows.
- `npm run supabase:types`: Regenerate Supabase client types at `utils/supabase/database.types.ts` after schema updates.

## Coding Style & Naming Conventions
- TypeScript strict; favor typed server actions and components. Use the `@/` alias for locals.
- Naming: components/contexts PascalCase; hooks `useThing`; utilities `camelCase`. Keep modules focused.
- Formatting via Prettier and Tailwind class sorting; 2-space indentation. Keep imports ordered (simple-import-sort) and remove unused symbols.
- Tailwind for styling; co-locate component styles with the component; avoid extra globals beyond `app/globals.css`.

## Testing Guidelines
- No automated suite yet; run `npm run lint` and smoke-test key flows (auth, entities, cashflow, transactions) locally.
- If adding tests, lean on React Testing Library for components/route handlers; name files after the module (`component.test.tsx`).
- Keep fixtures near tests; mock Supabase calls when possible and note required env vars in the test description.

## Commit & Pull Request Guidelines
- Commits: short, present-tense summaries (e.g., “Fix currency conversion parameter order”); keep concerns isolated.
- PRs: describe user-visible change, risks, and verification steps. Link issues when relevant; add screenshots/gifs for UI tweaks.
- Note env vars, migrations, or Supabase type regeneration in the PR body. Ensure `npm run lint` and, for production changes, `npm run build` pass locally.

## Security & Configuration Tips
- Store env vars in `.env.local`; do not commit secrets. Use Vercel/Supabase dashboards for production values.
- After schema updates: apply migrations in `supabase/migrations/`, rerun `npm run supabase:types`, and update any affected Zod schemas or validators.
