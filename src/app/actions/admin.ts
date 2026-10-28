"use server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { CEFR_LEVELS } from "@/lib/csv/schema";
import { cleanText, normalizeWord, posKey, recordFlags, splitList } from "@/lib/csv/validate";
import type { FormState } from "./auth";

const http = (u: string) => { try { return ["http:", "https:"].includes(new URL(u).protocol); } catch { return false; } };

export async function saveWordAction(_: FormState, fd: FormData): Promise<FormState> {
  let ctx; try { ctx = await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }
  const { sb } = ctx;
  const g = (k: string) => cleanText(String(fd.get(k) ?? ""));
  const id = g("id");
  const word = g("english_word"), bn = g("bengali_meaning");
  if (!word || !bn) return { error: "English word and Bengali meaning are required." };
  const cefr = g("cefr_level") || "unknown";
  if (cefr !== "unknown" && !(CEFR_LEVELS as readonly string[]).includes(cefr)) return { error: "Invalid CEFR level." };
  for (const k of ["audio_url", "source_url"]) if (g(k) && !http(g(k))) return { error: `${k} must be an http(s) URL.` };

  let category_id: string | null = null;
  if (g("category")) {
    const { data: c } = await sb.from("categories").select("id").eq("name", g("category")).maybeSingle();
    if (c) category_id = c.id;
    else { const { data: n, error } = await sb.from("categories").insert({ name: g("category") }).select("id").single(); if (error) return { error: error.message }; category_id = n.id; }
  }
  const pos = g("part_of_speech") || null;
  const rec = {
    english_word: word, normalized_word: normalizeWord(word), bengali_meaning: bn, part_of_speech: pos, pos_key: posKey(pos),
    cefr_level: cefr, cefr_status: g("cefr_status") === "verified" ? "verified" : "provisional", category_id,
    pronunciation: g("pronunciation") || null, audio_url: g("audio_url") || null,
    collocations: splitList(g("collocations")), synonyms: splitList(g("synonyms")), antonyms: splitList(g("antonyms")), word_forms: splitList(g("word_forms")),
    example_sentence: g("example_sentence") || null, example_translation_bn: g("example_translation_bn") || null, practice_sentence: g("practice_sentence") || null,
    flashcard_front: g("flashcard_front") || null, flashcard_back: g("flashcard_back") || null,
    quiz_question: g("quiz_question") || null, quiz_correct_answer: g("quiz_correct_answer") || null, quiz_options: splitList(g("quiz_options")),
    quiz_verified: fd.get("quiz_verified") === "on", status: g("status") === "draft" ? "draft" : "published",
    source_name: g("source_name") || null, source_url: g("source_url") || null, license_name: g("license_name") || null,
    attribution_text: g("attribution_text") || null, source_note: g("source_note") || null,
  };
  let existingFlags: string[] = [];
  if (id) { const { data } = await sb.from("vocabulary_words").select("review_flags").eq("id", id).maybeSingle(); existingFlags = data?.review_flags ?? []; }
  const review_flags = fd.get("mark_reviewed") === "on" ? [] : [...new Set([...existingFlags, ...recordFlags({ ...rec, category: null } as any)])];
  const { error } = id ? await sb.from("vocabulary_words").update({ ...rec, review_flags }).eq("id", id) : await sb.from("vocabulary_words").insert({ ...rec, review_flags, import_batch: "manual" });
  if (error) return { error: error.code === "23505" ? "An entry with the same word and part of speech already exists." : error.message };
  redirect("/admin/words");
}

export async function deleteWordAction(fd: FormData) {
  const { sb } = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (/^[0-9a-f-]{36}$/i.test(id)) await sb.from("vocabulary_words").delete().eq("id", id);
  redirect("/admin/words");
}
