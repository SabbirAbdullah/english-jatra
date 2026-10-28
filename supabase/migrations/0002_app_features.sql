-- App features: full-text-ish search column, auto profile creation, practice sentences, IELTS responses.

-- Search over English word, Bengali meaning, synonyms, antonyms and collocations (maintained by trigger).
alter table public.vocabulary_words add column if not exists search_text text not null default '';
create or replace function public.vocab_search_text() returns trigger language plpgsql as $$
begin
  new.search_text := lower(
    coalesce(new.english_word,'') || ' ' || coalesce(new.bengali_meaning,'') || ' ' ||
    coalesce(array_to_string(new.synonyms,' '),'') || ' ' || coalesce(array_to_string(new.antonyms,' '),'') || ' ' ||
    coalesce(array_to_string(new.collocations,' '),''));
  return new;
end $$;
drop trigger if exists vocab_search_text_trg on public.vocabulary_words;
create trigger vocab_search_text_trg before insert or update on public.vocabulary_words
  for each row execute function public.vocab_search_text();
update public.vocabulary_words set english_word = english_word;   -- backfill existing rows through the trigger
create index if not exists vocab_search_trgm on public.vocabulary_words using gin (search_text gin_trgm_ops);

-- Create a profile row whenever someone signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (user_id, display_name) values (new.id, split_part(new.email, '@', 1))
  on conflict (user_id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.practice_sentences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid references public.vocabulary_words(id) on delete set null,
  sentence text not null check (length(sentence) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ps_user_idx on public.practice_sentences (user_id, created_at desc);
create trigger ps_touch before update on public.practice_sentences for each row execute function public.touch_updated_at();

create table public.ielts_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null check (module in ('speaking','writing')),
  task text not null,
  prompt text not null,
  body text not null check (length(body) <= 20000),
  word_count int not null default 0,
  status text not null default 'draft' check (status in ('draft','submitted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ir_user_idx on public.ielts_responses (user_id, created_at desc);
create trigger ir_touch before update on public.ielts_responses for each row execute function public.touch_updated_at();

alter table public.practice_sentences enable row level security;
alter table public.ielts_responses enable row level security;
create policy "own sentences" on public.practice_sentences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own ielts" on public.ielts_responses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
