# Copilot instructions for English Jani

Start with [docs/GUIDE.md](../docs/GUIDE.md) for Supabase setup, admin access, CSV import, migrations, and deployment.

## Build, test, and verification commands

```bash
npm install
npm test
npx vitest run tests/logic.test.ts
npx vitest run tests/csv.test.ts
npx vitest run tests/logic.test.ts -t "skips fill-in-the-blank for flagged templated examples"
npm run typecheck
npm run build
npm run dev
npm run seed:dry
```

`npm run build` needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; placeholders are sufficient to build. There is no lint script. `npm run seed:dry` validates the default CSV without connecting to Supabase, but writes its report and issues CSV under `docs/`.

## High-level architecture

- This is a Next.js 15 App Router app using TypeScript, React, Tailwind, and Supabase (Postgres, Auth, and RLS). Route pages and API handlers live in `src/app/`; feature server actions are grouped in `src/app/actions/`; reusable UI is in `src/components/`.
- `src/lib/` contains domain logic and data access. `data.ts` handles vocabulary queries and learning statistics; `srs.ts`, `quiz.ts`, and `checks.ts` contain review scheduling, quiz generation/grading, and writing/sentence checks.
- Supabase schema and access policies are defined by `supabase/migrations/0001_schema.sql` followed by `0002_app_features.sql`. The session-bound client in `src/lib/supabase/server.ts` is used for normal user/admin requests so RLS applies. The service-role client in `src/lib/supabase/service.ts` bypasses RLS and is restricted to authorized server-only operations and the CLI seed script.
- Authentication is checked at more than one layer: middleware refreshes sessions and gates signed-out users from protected paths, but admin authorization is checked again server-side in admin layouts, actions, and API routes. Use the existing `getUser`, `requireAdmin`, and session-bound client patterns rather than relying on middleware alone.
- CSV import is a shared pipeline for the admin UI and `scripts/seed.ts`: parse UTF-8 bytes, map headers, validate rows, plan duplicate handling, then commit in batches through `src/lib/import/`. The UI re-parses and validates uploaded bytes on the server; the preview is not trusted as input. Import logic is separated from Supabase storage so parsing, planning, and partial-failure/retry behavior can be tested without a live database.
- IELTS speaking, writing, and reading prompts are local content in `src/lib/ielts-content.ts`; spoken-English practice content is in `src/lib/spoken-content.ts`. Speaking/writing responses are stored in Supabase. Reading questions sent to the browser omit the answer key, which is used by the server action.

## Repository-specific conventions

- Use the `@/*` alias for imports from `src/`. Keep business rules in `src/lib/`, feature mutations in the existing server-action modules, and reusable UI in `src/components/`.
- For user- or admin-context database access, use the session-bound Supabase client. Check admin rights on the server for every privileged action or route. Never expose `SUPABASE_SERVICE_ROLE_KEY` to client code or prefix it with `NEXT_PUBLIC_`.
- Preserve vocabulary normalization and review conventions: duplicate identity is normalized word plus part of speech (except the explicit `new_only` mode, which excludes any matching word); retain fields such as `normalized_word`, `search_text`, `cefr_status`, and `review_flags`. New CEFR assignments are provisional unless verified.
- The import commit path is idempotent and reports failed batches instead of counting them as successful; preserve that behavior when changing import logic. For CSV parsing, validation, duplicate handling, or commit changes, run `tests/csv.test.ts`. For spaced repetition, quiz, or writing-check changes, run `tests/logic.test.ts`; select an individual case with Vitest's `-t` option.
- Tests use Vitest with the `@` alias configured in `vitest.config.ts`; the current suite is in `tests/logic.test.ts` and `tests/csv.test.ts` and does not require a live Supabase project.
- Supabase browser-facing code uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; server-only operations may also require `SUPABASE_SERVICE_ROLE_KEY`. See `.env.example` and `docs/GUIDE.md` for setup and usage.
