"use server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { buildQuestion, buildQuiz, correctAnswerText, eligibleTypes, explanationFor, isCorrect, type QWord, type Question, type QuizType } from "@/lib/quiz";

const SEL = "id,english_word,bengali_meaning,part_of_speech,synonyms,antonyms,collocations,example_sentence,review_flags,cefr_level,category_id";
const TYPES = ["en_to_bn", "bn_to_en", "synonym", "antonym", "fill_blank"];
type W = QWord & { cefr_level: string; category_id: string | null };

export async function startQuizAction(input: { level?: string; cat?: string; count: number; type: string; wordId?: string }) {
  const sb = await createClient();
  const count = Math.min(30, Math.max(1, Math.floor(Number(input.count) || 10)));
  const type = input.type === "mixed" || TYPES.includes(input.type) ? (input.type as QuizType | "mixed") : "mixed";
  const { data, error } = await sb.from("vocabulary_words").select(SEL).eq("status", "published").limit(1000);
  if (error) return { ok: false as const, error: error.message };
  const pool = (data ?? []) as unknown as W[];
  let questions: Question[];
  if (input.wordId) {
    const w = pool.find((x) => x.id === input.wordId);
    if (!w) return { ok: false as const, error: "Word not found." };
    questions = eligibleTypes(w, pool).map((t) => buildQuestion(w, t, pool)).filter((q): q is Question => !!q);
  } else {
    const targets = pool.filter((w) => (!input.level || w.cefr_level === input.level) && (!input.cat || w.category_id === input.cat));
    questions = buildQuiz(targets, pool, { type, count });
  }
  if (!questions.length) return { ok: false as const, error: "Not enough eligible words for these settings. Try another level, category or question type." };
  const note = !input.wordId && questions.length < count ? `Only ${questions.length} well-formed questions are available for these settings.` : undefined;
  return { ok: true as const, questions, note };
}

export async function submitQuizAction(input: { questions: Question[]; answers: (string | null)[]; mode: "practice" | "timed"; type: string }) {
  const { sb, user } = await getUser();
  const qs = Array.isArray(input.questions) ? input.questions.slice(0, 50) : [];
  if (!qs.length || qs.some((q) => !TYPES.includes(q.type) || typeof q.wordId !== "string")) return { ok: false as const, error: "Invalid quiz." };
  const ids = [...new Set(qs.map((q) => q.wordId))];
  const { data, error } = await sb.from("vocabulary_words").select(SEL).in("id", ids);
  if (error) return { ok: false as const, error: error.message };
  const byId = new Map((data as unknown as W[]).map((w) => [w.id, w]));
  const results = qs.map((q, i) => {
    const w = byId.get(q.wordId);
    const selected = typeof input.answers?.[i] === "string" ? input.answers[i]!.slice(0, 300) : null;
    const ok = w ? isCorrect(w, q.type, selected) : false;
    return { wordId: q.wordId, word: w?.english_word ?? "?", type: q.type, prompt: String(q.prompt).slice(0, 400), selected, correct: ok, correctAnswer: w ? correctAnswerText(w, q.type) : "", explanation: w ? explanationFor(w) : "" };
  });
  const score = results.filter((r) => r.correct).length;
  let saved = false;
  if (user) {
    const { data: att, error: e1 } = await sb.from("quiz_attempts").insert({ user_id: user.id, quiz_type: input.type, mode: input.mode === "timed" ? "timed" : "practice", total: results.length, correct: score, finished_at: new Date().toISOString() }).select("id").single();
    if (!e1 && att) {
      const { error: e2 } = await sb.from("quiz_responses").insert(results.map((r) => ({ attempt_id: att.id, word_id: r.wordId, selected_answer: r.selected, correct_answer: r.correctAnswer, is_correct: r.correct })));
      saved = !e2;
    }
  }
  return { ok: true as const, score, total: results.length, percent: Math.round((score / results.length) * 100), results, saved, signedIn: !!user };
}
