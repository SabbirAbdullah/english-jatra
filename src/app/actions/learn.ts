"use server";
import { getUser } from "@/lib/auth";
import { nextProgress, type Rating } from "@/lib/srs";
import { sentenceChecks } from "@/lib/checks";

type Res = { ok: boolean; error?: string; notes?: string[] };
const AUTH: Res = { ok: false, error: "AUTH" };
const isId = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);

export async function toggleSaveAction(wordId: string, save: boolean): Promise<Res> {
  const { sb, user } = await getUser();
  if (!user) return AUTH;
  if (!isId(wordId)) return { ok: false, error: "Invalid word" };
  const { error } = save
    ? await sb.from("saved_words").upsert({ user_id: user.id, word_id: wordId })
    : await sb.from("saved_words").delete().eq("user_id", user.id).eq("word_id", wordId);
  return { ok: !error, error: error?.message };
}

/** Manual marking by the learner. "known" here is the learner's own statement, not a flashcard result. */
export async function setWordStatusAction(wordId: string, status: "known" | "learning" | "difficult" | "revision"): Promise<Res> {
  const { sb, user } = await getUser();
  if (!user) return AUTH;
  if (!isId(wordId) || !["known", "learning", "difficult", "revision"].includes(status)) return { ok: false, error: "Invalid request" };
  const { data: cur } = await sb.from("user_word_progress").select("*").eq("user_id", user.id).eq("word_id", wordId).maybeSingle();
  const now = new Date();
  const row = {
    user_id: user.id, word_id: wordId,
    status: status === "revision" ? (cur?.status === "difficult" ? "difficult" : "learning") : status,
    interval_days: status === "known" ? 7 : 0,
    next_review_at: new Date(now.getTime() + (status === "known" ? 7 * 86_400_000 : 0)).toISOString(),
    attempts: cur?.attempts ?? 0, correct_count: cur?.correct_count ?? 0, ease: cur?.ease ?? 2.5, last_reviewed_at: cur?.last_reviewed_at ?? null,
  };
  const { error } = await sb.from("user_word_progress").upsert(row);
  return { ok: !error, error: error?.message };
}

export async function reviewCardAction(wordId: string, rating: Rating): Promise<Res> {
  const { sb, user } = await getUser();
  if (!user) return AUTH;
  if (!isId(wordId) || !["know", "learning", "difficult"].includes(rating)) return { ok: false, error: "Invalid request" };
  const { data: cur } = await sb.from("user_word_progress").select("*").eq("user_id", user.id).eq("word_id", wordId).maybeSingle();
  const next = nextProgress(cur, rating);
  const { error } = await sb.from("user_word_progress").upsert({ user_id: user.id, word_id: wordId, ...next });
  return { ok: !error, error: error?.message };
}

export async function savePracticeSentenceAction(sentence: string, wordId?: string | null, targetWord?: string, id?: string): Promise<Res> {
  const { sb, user } = await getUser();
  if (!user) return AUTH;
  const s = sentence.trim();
  if (!s || s.length > 500) return { ok: false, error: "Sentence must be 1–500 characters." };
  const notes = sentenceChecks(s, targetWord);
  const q = id
    ? sb.from("practice_sentences").update({ sentence: s }).eq("id", id).eq("user_id", user.id)
    : sb.from("practice_sentences").insert({ user_id: user.id, sentence: s, word_id: wordId && isId(wordId) ? wordId : null });
  const { error } = await q;
  return { ok: !error, error: error?.message, notes };
}

export async function deletePracticeSentenceAction(id: string): Promise<Res> {
  const { sb, user } = await getUser();
  if (!user) return AUTH;
  const { error } = await sb.from("practice_sentences").delete().eq("id", id).eq("user_id", user.id);
  return { ok: !error, error: error?.message };
}

export async function checkSentenceAction(sentence: string, targetWord?: string): Promise<string[]> {
  return sentenceChecks(sentence.slice(0, 500), targetWord);
}
