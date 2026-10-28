"use server";
import { getUser } from "@/lib/auth";
import { READING_KEY } from "@/lib/ielts-content";
import { wordCount, writingChecks } from "@/lib/checks";

export async function saveResponseAction(input: { module: "speaking" | "writing"; task: string; prompt: string; body: string; status: "draft" | "submitted"; minWords?: number; id?: string }) {
  const { sb, user } = await getUser();
  if (!user) return { ok: false as const, error: "AUTH" };
  const body = String(input.body ?? "").slice(0, 20000);
  if (!body.trim()) return { ok: false as const, error: "Write something first." };
  const row = { module: input.module, task: String(input.task).slice(0, 40), prompt: String(input.prompt).slice(0, 1000), body, word_count: wordCount(body), status: input.status === "submitted" ? "submitted" : "draft" };
  const q = input.id ? sb.from("ielts_responses").update(row).eq("id", input.id).eq("user_id", user.id).select("id").single()
                     : sb.from("ielts_responses").insert({ ...row, user_id: user.id }).select("id").single();
  const { data, error } = await q;
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, id: data.id as string, notes: input.status === "submitted" ? writingChecks(body, input.minWords ?? (input.module === "speaking" ? 40 : 150)) : [] };
}

export async function deleteResponseAction(id: string) {
  const { sb, user } = await getUser();
  if (!user) return { ok: false };
  const { error } = await sb.from("ielts_responses").delete().eq("id", id).eq("user_id", user.id);
  return { ok: !error };
}

const norm = (s: string) => s.toLowerCase().replace(/[.\s]+$/g, "").trim();
export async function gradeReadingAction(answers: Record<string, string>) {
  const results = Object.entries(READING_KEY).map(([id, k]) => {
    const given = String(answers?.[id] ?? "");
    return { id, correct: !!given && k.answers.some((a) => norm(a) === norm(given)), given, answer: k.answers[0], why: k.why };
  });
  return { score: results.filter((r) => r.correct).length, total: results.length, results };
}
