-- EnglishShikhi: core schema, indexes and Row Level Security.
-- Apply with: supabase db push   (or paste into the Supabase SQL editor)

create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- ---------- roles ----------
create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now()
);
alter table public.user_roles enable row level security;
-- Users may read only their own role row. No insert/update/delete policy exists for clients,
-- so roles can only be granted with the service role or the SQL editor (see README: "Create the first admin").
create policy "read own role" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------- vocabulary ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.vocabulary_words (
  id uuid primary key default gen_random_uuid(),
  external_id text,                         -- id from the source file; traceability only
  import_batch text,                        -- e.g. 'batch_001'
  english_word text not null check (length(btrim(english_word)) > 0),
  normalized_word text not null,
  bengali_meaning text not null check (length(btrim(bengali_meaning)) > 0),
  part_of_speech text,
  pos_key text not null default '',         -- sorted, lower-cased POS set; part of the identity
  cefr_level text not null default 'unknown' check (cefr_level in ('A1','A2','B1','B2','C1','C2','unknown')),
  cefr_status text not null default 'provisional' check (cefr_status in ('provisional','verified')),
  category_id uuid references public.categories(id) on delete set null,
  pronunciation text,
  audio_url text check (audio_url is null or audio_url ~* '^https?://'),
  collocations text[] not null default '{}',
  example_sentence text,
  example_translation_bn text,
  synonyms text[] not null default '{}',
  antonyms text[] not null default '{}',
  word_forms text[] not null default '{}',
  practice_sentence text,
  flashcard_front text,
  flashcard_back text,
  quiz_question text,
  quiz_correct_answer text,
  quiz_options text[] not null default '{}',
  quiz_verified boolean not null default false,   -- quiz engine uses stored options only when true
  source_name text,
  source_url text check (source_url is null or source_url ~* '^https?://'),
  license_name text,
  attribution_text text,
  source_note text,
  review_flags text[] not null default '{}',      -- editorial-review flags from import validation
  status text not null default 'published' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Identity: same spelling with a different part of speech is a different entry.
  constraint vocabulary_identity unique (normalized_word, pos_key)
);
create index vocab_cefr_idx on public.vocabulary_words (cefr_level);
create index vocab_category_idx on public.vocabulary_words (category_id);
create index vocab_status_idx on public.vocabulary_words (status);
create index vocab_created_idx on public.vocabulary_words (created_at desc);
create index vocab_word_trgm on public.vocabulary_words using gin (english_word gin_trgm_ops);
create index vocab_bn_trgm on public.vocabulary_words using gin (bengali_meaning gin_trgm_ops);
create index vocab_syn_gin on public.vocabulary_words using gin (synonyms);
create index vocab_colloc_gin on public.vocabulary_words using gin (collocations);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger vocab_touch before update on public.vocabulary_words for each row execute function public.touch_updated_at();

alter table public.categories enable row level security;
alter table public.vocabulary_words enable row level security;
create policy "public read categories" on public.categories for select using (true);
create policy "admin write categories" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public read published words" on public.vocabulary_words for select using (status = 'published' or public.is_admin());
create policy "admin write words" on public.vocabulary_words for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- per-user data (private) ----------
create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  target_cefr text check (target_cefr in ('A1','A2','B1','B2','C1','C2')),
  daily_word_goal int not null default 10 check (daily_word_goal between 1 and 200),
  theme text not null default 'system' check (theme in ('light','dark','system')),
  created_at timestamptz not null default now()
);

create table public.user_word_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references public.vocabulary_words(id) on delete cascade,
  status text not null default 'new' check (status in ('new','learning','known','difficult')),
  attempts int not null default 0,
  correct_count int not null default 0,
  ease numeric not null default 2.5,            -- SM-2 style ease factor
  interval_days int not null default 0,
  next_review_at timestamptz,
  last_reviewed_at timestamptz,
  primary key (user_id, word_id)
);
create index uwp_due_idx on public.user_word_progress (user_id, next_review_at);

create table public.saved_words (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references public.vocabulary_words(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, word_id)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_type text not null,
  mode text not null check (mode in ('practice','timed')),
  total int not null check (total > 0),
  correct int not null check (correct >= 0),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index qa_user_idx on public.quiz_attempts (user_id, started_at desc);

create table public.quiz_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  word_id uuid references public.vocabulary_words(id) on delete set null,
  selected_answer text,
  correct_answer text not null,
  is_correct boolean not null
);

alter table public.user_profiles enable row level security;
alter table public.user_word_progress enable row level security;
alter table public.saved_words enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_responses enable row level security;
create policy "own profile" on public.user_profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own progress" on public.user_word_progress for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own saved" on public.saved_words for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own attempts" on public.quiz_attempts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own responses" on public.quiz_responses for all to authenticated
  using (exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.user_id = auth.uid()));

-- ---------- import audit (admin only) ----------
create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  batch_name text not null,
  file_name text,
  file_bytes int,
  duplicate_mode text not null check (duplicate_mode in ('skip','update','new_only')),
  status text not null check (status in ('completed','completed_with_errors','failed')),
  rows_detected int not null, rows_imported int not null, rows_updated int not null,
  rows_skipped int not null, rows_rejected int not null, warnings int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.import_errors (
  id bigserial primary key,
  job_id uuid not null references public.import_jobs(id) on delete cascade,
  row_number int not null, column_name text, severity text not null, code text not null, message text not null
);
create index import_errors_job_idx on public.import_errors (job_id);
alter table public.import_jobs enable row level security;
alter table public.import_errors enable row level security;
create policy "admin imports" on public.import_jobs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin import errors" on public.import_errors for all to authenticated using (public.is_admin()) with check (public.is_admin());
