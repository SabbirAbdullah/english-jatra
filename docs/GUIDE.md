# EnglishBoli — complete setup, import and deployment guide

Everything below is in the order you should do it. Total time: about 45 minutes.

## 0. What you need
- Node.js 20 or newer (`node -v`), Git, a free Supabase account, a free Vercel account, a GitHub account.

## 1. Run the project locally
```bash
cd english-boli
npm install
npm test            # 36 tests, no database needed
npm run typecheck
npm run seed:dry    # validates data/english_vocabulary_batch_001_enhanced.csv, touches no database
```

## 2. Create the Supabase project (your live database)
1. supabase.com → **New project**. Choose a name, a strong database password (save it), and the region nearest your users.
2. Wait until the project finishes provisioning.
3. **SQL Editor → New query.** Paste the whole of `supabase/migrations/0001_schema.sql` → **Run**. Then paste `supabase/migrations/0002_app_features.sql` → **Run**. (Run them in this order, once each.)
4. **Table Editor** should now list: categories, vocabulary_words, user_roles, user_profiles, user_word_progress, saved_words, quiz_attempts, quiz_responses, import_jobs, import_errors, practice_sentences, ielts_responses. Each shows “RLS enabled”.

## 3. Configure environment variables
Supabase → **Project Settings → API** (called “API Keys” in newer dashboards).
```bash
cp .env.example .env.local
```
| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | “Project URL” |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the `anon` / “publishable” key (safe for browsers; protected by RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | the `service_role` / “secret” key. **Server only.** Never commit it, never prefix it `NEXT_PUBLIC_`. Used for account deletion and the CLI seed script |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally; your real domain in production |

## 4. Configure sign-in
Supabase → **Authentication**:
- **URL Configuration**: Site URL = `http://localhost:3000` (change to your domain after deploying). Under Redirect URLs add `http://localhost:3000/auth/callback`.
- **Providers → Email**: keep enabled. “Confirm email” on = users must click an email link (recommended for production). Off = instant sign-up (easier for testing).
- Supabase’s built-in email sender is rate-limited; for real traffic configure your own SMTP under **Authentication → SMTP**.

## 5. Run the website
```bash
npm run dev          # http://localhost:3000
```
Register an account at `/register`. If email confirmation is on, click the link in the email first.

## 6. Create the first administrator
Admin rights live in the database table `user_roles`; nothing in the browser can grant them.
1. Register normally (step 5).
2. Supabase **SQL Editor**:
```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'YOUR-EMAIL@example.com';
```
3. Refresh the site. An **Admin** link appears in the sidebar. Give admin to nobody else unless you intend to.

## 7. Import the first batch (170 words)
**Option A — in the website (recommended; this is also how you will import every later batch):**
1. Sign in as admin → **Admin → Import CSV**.
2. Drag in `data/english_vocabulary_batch_001_enhanced.csv`.
3. Check the preview (170 records; columns auto-mapped; the repeated `category` column is noted and ignored).
4. Leave duplicate handling on **Skip duplicates** → **Validate**.
5. Read the report. Expected for this file: 170 to import, 0 rejected. You will see many *warnings*; they are data-quality flags (placeholder quiz options, templated examples, awkward Bengali), not import failures. Download the issues CSV if you want a to-do list.
6. Enter batch name `batch_001`, tick the confirmation box → **Import now**.
7. Open **Vocabulary**: 170 words, searchable in English and Bengali.

**Option B — command line (no admin account needed; uses the service-role key):**
```bash
npx tsx --env-file=.env.local scripts/seed.ts --batch batch_001
```
Re-running either option is safe: existing words are skipped, never duplicated.

## 8. Import the next batch (every time)
1. **Admin → Import CSV → Download blank template.** It is an empty CSV with the correct header row.
2. Fill it in Excel/Google Sheets and save as **CSV UTF-8**. Bengali text must stay as real Bengali characters.
3. Required columns: `english_word`, `bengali_meaning`. Everything else is optional; leave a column empty rather than inventing data.
   - `part_of_speech`: noun, verb, adjective, adverb, preposition, conjunction, pronoun, interjection, determiner, phrase.
   - `cefr_level`: A1–C2 or `unknown`. New levels are stored as *provisional* unless you later verify them in Admin → Words.
   - List columns (`collocations`, `synonyms`, `antonyms`, `word_forms`): separate with `;`.
   - Do not fill `quiz_options` with placeholders. The quiz engine builds its own options from the database.
4. Upload it, check the **mapping** (change a dropdown if your headers differ), choose a duplicate mode, **Validate**, review, give it a batch name such as `batch_002`, confirm, **Import now**.
5. Duplicates are checked against **all earlier batches**, not only this file. Identity = word (case-insensitive) + part of speech.
6. If something failed midway, the report says which rows; fix the cause and upload the same file again. Rows already stored are skipped, so only the missing ones are written.
7. Admin → **Import history** keeps every job and lets you download its issues CSV. Admin → **Export** downloads vocabulary (all, or filtered by level, topic or batch) as Excel-friendly CSV.

Duplicate modes: **Skip** (same word+POS skipped; same word with another POS imported), **Update** (overwrite matching records; the report lists which fields would change first), **New only** (skip any word that already exists in any form).

## 9. Fix the data-quality problems found in batch 001
Admin → **Words** → tick “Only entries with review flags”. Edit an entry, correct it, tick “I have reviewed this entry” to clear its flags. Main issues: example sentences that are templates (flag `TEMPLATED_EXAMPLE`), a/an errors, awkward Bengali translations, and placeholder quiz options. Until you fix an example, the app labels it “under editorial review” and excludes it from fill-in-the-blank quizzes.

## 10. Put the code on GitHub
```bash
git init && git add . && git commit -m "EnglishBoli"
git branch -M main
git remote add origin https://github.com/YOUR-USER/english-boli.git
git push -u origin main
```
`.gitignore` already excludes `.env.local` and `node_modules`. Confirm no key appears in `git status` before pushing.

## 11. Deploy to Vercel (make it live)
1. vercel.com → **Add New → Project** → import the GitHub repo. Framework is detected as Next.js; keep defaults.
2. **Environment Variables**: add the four variables from step 3. Set `NEXT_PUBLIC_SITE_URL` to your final URL (you may need to deploy once, copy the URL Vercel gives you, then update this and redeploy).
3. **Deploy.**
4. Back in Supabase → **Authentication → URL Configuration**: set Site URL to your Vercel/custom domain and add `https://YOUR-DOMAIN/auth/callback` to Redirect URLs. Without this, confirmation and password-reset emails will point to localhost.
5. Optional: Vercel → Settings → Domains to attach your own domain (then update step 4 again).

## 12. Verify production
- [ ] Home page loads; **Vocabulary** shows 170 words; searching `achieve` and `অর্জন` both work.
- [ ] Register with a real email; confirmation link opens your live site and signs you in.
- [ ] Flashcards: flip, rate a card; **My Learning → Overview** shows it.
- [ ] Quiz: finish one; it appears in **My Learning → Quiz history**.
- [ ] Sign in as a second user: you cannot see the first user’s saved words or history.
- [ ] As the second (non-admin) user open `/admin`: you see “Administrators only”, and `/api/admin/export` returns 403.
- [ ] As admin: upload a 2-row CSV with a new batch name and confirm it imports and appears in Import history.

## 13. Security model in one paragraph
Every browser request runs as the signed-in user, so Postgres Row Level Security decides what it can read or write. Vocabulary is world-readable when published; only users listed in `user_roles` (checked by the `is_admin()` function) can change vocabulary or see import data; progress, saved words, quiz history, sentences and IELTS drafts are visible only to their owner. `user_roles` has no client write policy. Admin pages, server actions and API routes each re-check the role on the server. Uploaded CSV bytes are re-parsed and re-validated on the server; the browser’s preview is never trusted. Exports neutralise formula injection. The service-role key is used in exactly two places: deleting your own account and the CLI seed script.

## 14. Known limitations (be aware before launching)
- **Not tested against a live Supabase project.** The app builds, 36 automated tests pass, and guest/auth gates were smoke-tested, but the SQL, RLS policies and every database-backed screen need your first real run. Work through step 12 and report anything that fails.
- **Batch 001 content quality** (see step 9): placeholder quiz options, templated examples, 57 awkward Bengali translations, all CEFR levels unverified.
- **Not included:** IELTS Listening (needs audio you own or that is licensed), AI-powered feedback (all feedback is simple rule-based checks and says so), the optional web-source import module, word-form quiz questions, automatic recorded pronunciation (the Listen button uses the browser’s English voice unless a word has an `audio_url`).
- Days for streaks and “today” are counted in UTC. The rate limiter is in-memory per server instance. Quiz distractors are drawn from the first 1,000 published words.
- Browser/UI tests (responsive layout, Playwright) were not run in this environment.

## 15. Extending the app
- **Listening audio:** record your own short dialogues, upload to Supabase Storage (public bucket), store the URLs plus questions in a new table, and add a page under `src/app/ielts/listening`.
- **AI feedback:** add a server action that calls your AI provider with the key in a server-only env var; fall back to `writingChecks()` when the key is absent.
- **More content:** edit `src/lib/spoken-content.ts` and `src/lib/ielts-content.ts`.
