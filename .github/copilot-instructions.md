# Copilot instructions for EnglishShikhi

Start here: `docs/GUIDE.md` for the project setup, Supabase configuration, admin flow, CSV import workflow, and production deployment notes.

## Build, test, and verification commands

Use the project scripts from `package.json`:

```bash
npm install
npm test               # runs the full Vitest suite
npx vitest run tests/logic.test.ts
npx vitest run tests/csv.test.ts
npx vitest run -t "skips fill-in-the-blank for flagged templated examples"
npm run typecheck
npm run build          # requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
npm run seed:dry       # validates the import batch without touching the database
```

There is no dedicated lint script in this repo; prefer `npm run typecheck` and the relevant Vitest targets when validating a change.

## High-level architecture

- This is a Next.js 15 App Router project with TypeScript and Tailwind.
- Route-level pages live in `src/app/`, with shared UI in `src/components/`.
- Business logic and server-side data access live in `src/lib/`.
- Supabase is the primary backend and auth provider. The server client is created in `src/lib/supabase/server.ts` and all reads/writes are expected to use the signed-in user context so Row Level Security applies.
- The app is organized around a vocabulary + learning workflow rather than a generic CRUD app:
  - `src/lib/data.ts` handles vocabulary search, categories, progress, and per-user stats.
  - `src/lib/srs.ts` contains spaced repetition scheduling logic.
  - `src/lib/quiz.ts` and `src/lib/checks.ts` power quiz generation and language-quality checks.
  - `src/lib/csv/` validates and parses CSV upload data; `src/lib/import/` commits import batches into Supabase.
- Database schema and RLS definitions live under `supabase/migrations/`; the project expects a live Supabase project for normal app behavior.
- The repository also includes `templates/`, `data/`, and `scripts/` for import templates and batch seeding, with the import workflow described in the setup guide.

## Project conventions and repository-specific patterns

- Keep route-level UI in `src/app/*/page.tsx` and reusable UI in `src/components/*`.
- Prefer the existing helper modules in `src/lib` over ad hoc database access or custom query code.
- When changing anything in the import pipeline, validate both the parser/validator and the commit flow in `tests/csv.test.ts`.
- For user-facing data, preserve the project’s normalized data conventions (`normalized_word`, `search_text`, `cefr_status`, review flags, duplicate matching by word + part of speech) unless the existing tests and app behavior explicitly require a different shape.
- Supabase environment variables are intentionally split between public and server-only keys:
  - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are used in the browser/client app.
  - `SUPABASE_SERVICE_ROLE_KEY` is server-only and should not be exposed as a public env var.
- Most pages are user-specific and assume a signed-in session; local development without Supabase config will render a configuration warning in the root layout instead of failing at runtime.
- Review `docs/GUIDE.md` for environment setup, import duplication rules, admin workflow, and the installation/deployment checklist before making operational changes.

## Testing expectations

- Prefer targeted Vitest runs over broad suites when iterating.
- If a change affects CSV ingestion, validation, duplicate handling, or quiz logic, run the corresponding test file(s) directly.
- Keep test names and assertions aligned with the project’s domain language: vocabulary, SRS progress, CEFR values, duplicate conflict handling, and import batch status.
