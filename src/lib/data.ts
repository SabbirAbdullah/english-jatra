import type { createClient } from "./supabase/server";
import type { Category, Word } from "./types";

type SB = Awaited<ReturnType<typeof createClient>>;
export const PAGE_SIZE = 20;

export interface WordFilters { q?: string; level?: string; pos?: string; cat?: string; sort?: string; page?: number; pageSize?: number; flagged?: boolean; includeDrafts?: boolean }

export async function searchWords(sb: SB, f: WordFilters) {
  let q = sb.from("vocabulary_words").select("*, categories(name)", { count: "exact" });
  if (!f.includeDrafts) q = q.eq("status", "published");
  if (f.q?.trim()) q = q.ilike("search_text", `%${f.q.trim().toLowerCase().replace(/[%_\\]/g, "\\$&")}%`);
  if (f.level) q = q.eq("cefr_level", f.level);
  if (f.pos) q = q.ilike("part_of_speech", `%${f.pos.replace(/[%_\\]/g, "")}%`);
  if (f.cat) q = q.eq("category_id", f.cat);
  if (f.flagged) q = q.not("review_flags", "eq", "{}");
  if (f.sort === "recent") q = q.order("created_at", { ascending: false }).order("normalized_word");
  else if (f.sort === "level") q = q.order("cefr_level").order("normalized_word");
  else q = q.order("normalized_word");
  const size = f.pageSize ?? PAGE_SIZE, page = Math.max(1, f.page ?? 1), from = (page - 1) * size;
  const { data, count, error } = await q.range(from, from + size - 1);
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as unknown as Word[], total: count ?? 0, page, size };
}

export async function getCategories(sb: SB): Promise<Category[]> {
  const { data } = await sb.from("categories").select("id,name").order("name");
  return data ?? [];
}

export async function getWord(sb: SB, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await sb.from("vocabulary_words").select("*, categories(name)").eq("id", id).maybeSingle();
  return (data as unknown as Word) ?? null;
}

export async function adjacentWords(sb: SB, w: Word) {
  const [prev, next] = await Promise.all([
    sb.from("vocabulary_words").select("id,english_word").eq("status", "published").lt("normalized_word", w.normalized_word).order("normalized_word", { ascending: false }).limit(1),
    sb.from("vocabulary_words").select("id,english_word").eq("status", "published").gt("normalized_word", w.normalized_word).order("normalized_word").limit(1),
  ]);
  return { prev: prev.data?.[0] ?? null, next: next.data?.[0] ?? null };
}

export async function relatedWords(sb: SB, w: Word) {
  let q = sb.from("vocabulary_words").select("id,english_word,bengali_meaning,cefr_level").eq("status", "published").neq("id", w.id).limit(6);
  q = w.category_id ? q.eq("category_id", w.category_id) : q.eq("cefr_level", w.cefr_level);
  const { data } = await q;
  return data ?? [];
}

const dayKey = (d: string | Date) => new Date(d).toISOString().slice(0, 10);   // UTC days

export function computeStreak(dates: string[]): number {
  const days = new Set(dates.map(dayKey));
  let n = 0; const d = new Date();
  if (!days.has(dayKey(d))) d.setUTCDate(d.getUTCDate() - 1);   // today not finished yet: streak may still be alive
  while (days.has(dayKey(d))) { n++; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}

export async function getUserStats(sb: SB, userId: string) {
  const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
  const nowIso = new Date().toISOString();
  const [prog, saved, attempts, profile] = await Promise.all([
    sb.from("user_word_progress").select("word_id,status,next_review_at,last_reviewed_at,attempts").eq("user_id", userId).limit(5000),
    sb.from("saved_words").select("word_id", { count: "exact", head: true }).eq("user_id", userId),
    sb.from("quiz_attempts").select("id,quiz_type,mode,total,correct,started_at").eq("user_id", userId).order("started_at", { ascending: false }).limit(300),
    sb.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  const p = prog.data ?? [], a = attempts.data ?? [];
  const totalQ = a.reduce((s, x) => s + x.total, 0), totalC = a.reduce((s, x) => s + x.correct, 0);
  const activityDates = [...p.map((x) => x.last_reviewed_at).filter(Boolean), ...a.map((x) => x.started_at)] as string[];
  return {
    profile: profile.data,
    reviewedToday: p.filter((x) => x.last_reviewed_at && x.last_reviewed_at >= startOfDay.toISOString()).length,
    known: p.filter((x) => x.status === "known").length,
    difficult: p.filter((x) => x.status === "difficult").length,
    due: p.filter((x) => x.next_review_at && x.next_review_at <= nowIso).length,
    saved: saved.count ?? 0,
    accuracy: totalQ ? Math.round((totalC / totalQ) * 100) : null,
    recentScores: a.slice(0, 5),
    attempts: a, progress: p, activityDates,
    streak: computeStreak(activityDates),
  };
}
