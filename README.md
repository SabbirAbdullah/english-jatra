# EnglishJatra

English vocabulary, spoken English and IELTS practice for Bengali-speaking learners. Next.js 15 (App Router, TypeScript), Tailwind, Supabase (Postgres, Auth, RLS).

**Start here: [docs/GUIDE.md](docs/GUIDE.md)** (Supabase setup, first admin, importing batches, GitHub, Vercel, production checklist, known limitations).

```bash
npm install
npm test           # 36 tests
npm run typecheck
npm run build      # needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (placeholders are enough to build)
npm run dev
npm run seed:dry   # validate batch 001 without a database
```

Layout: `src/app` pages and server actions, `src/lib/csv` parsing/validation/export, `src/lib/import` commit + Supabase store, `src/lib/{srs,quiz,checks}.ts` learning logic, `supabase/migrations` schema + RLS, `templates` CSV template, `data` batch 001.
