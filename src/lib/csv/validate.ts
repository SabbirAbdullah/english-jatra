import { CEFR_LEVELS, FIELDS, LIMITS, PARTS_OF_SPEECH, REQUIRED_FIELDS, type CefrLevel, type VocabRecord } from "./schema";
import type { ParsedCsv } from "./parse";

export type Severity = "error" | "warning" | "info";
export interface Issue { row: number; column: string; severity: Severity; code: string; message: string }

/* ---------- header mapping ---------- */

const norm = (h: string) => h.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export type Mapping = Record<string, string | null>; // canonical field -> source header

export function autoMapHeaders(headers: string[]): { mapping: Mapping; unmapped: string[] } {
  const mapping: Mapping = {};
  const used = new Set<string>();
  for (const f of FIELDS) {
    // exact canonical name wins over aliases; first matching header wins (so "category" beats "category__2")
    const hit = headers.find((h) => !used.has(h) && norm(h) === f.name) ??
      headers.find((h) => !used.has(h) && f.aliases.includes(norm(h)));
    mapping[f.name] = hit ?? null;
    if (hit) used.add(hit);
  }
  return { mapping, unmapped: headers.filter((h) => !used.has(h)) };
}

export function missingRequiredMappings(mapping: Mapping): string[] {
  return REQUIRED_FIELDS.filter((f) => !mapping[f]);
}

/* ---------- normalization ---------- */

export const cleanText = (v: string | undefined): string =>
  (v ?? "").normalize("NFC").replace(/[\u200B\uFEFF]/g, "").replace(/[ \t\u00A0]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();

const EMPTY_SENTINELS = new Set(["", "-", "—", "–", "n/a", "na", "none", "null"]);
export const isEmptyValue = (v: string) => EMPTY_SENTINELS.has(v.toLowerCase());

export function splitList(v: string): string[] {
  if (isEmptyValue(v)) return [];
  const seen = new Set<string>();
  return v.split(/\s*[;|]\s*/).map((s) => s.trim()).filter((s) => !isEmptyValue(s)).filter((s) => {
    const k = s.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export const normalizeWord = (w: string) => w.normalize("NFC").toLowerCase().trim().replace(/\s+/g, " ");

/** "Verb/Noun" and "noun/verb" yield the same key. */
export const posKey = (pos: string | null) =>
  (pos ?? "").toLowerCase().split(/[\/,]/).map((s) => s.trim()).filter(Boolean).sort().join("/");

/** Duplicate identity: normalized headword + sorted part-of-speech set. Same spelling with a different POS is NOT a duplicate. */
export const matchKey = (r: Pick<VocabRecord, "normalized_word" | "pos_key">) => `${r.normalized_word}|${r.pos_key}`;

/* ---------- quality heuristics (flags for editorial review, never silently "fixed") ---------- */

const BENGALI = /[\u0980-\u09FF]/;
const PLACEHOLDER_OPTIONS = new Set(["বিপরীত অর্থ", "প্রসঙ্গ অনুযায়ী অর্থ"]);
const AN_EXCEPTIONS = /^(uni|use|usu|uti|eu|one|ubi|ura)/i;

export function recordFlags(r: VocabRecord): string[] {
  const f: string[] = [];
  const opts = r.quiz_options;
  if (opts.length) {
    if (opts.some((o) => PLACEHOLDER_OPTIONS.has(o))) f.push("QUIZ_PLACEHOLDER_OPTIONS");
    if (BENGALI.test(r.quiz_correct_answer ?? "") && opts.some((o) => !BENGALI.test(o))) f.push("QUIZ_MIXED_LANGUAGE_OPTIONS");
  }
  const s = r.example_sentence ?? "";
  const m = s.match(/\b[Aa] ([A-Za-z]+)/);
  if (m && /^[aeiou]/i.test(m[1]) && !AN_EXCEPTIONS.test(m[1])) f.push("ARTICLE_AGREEMENT");
  if (/করা\s+করতে/.test(r.example_translation_bn ?? "")) f.push("AWKWARD_BENGALI_TRANSLATION");
  if (r.antonyms.length === 0 && r.synonyms.length === 0 && r.collocations.length === 0) f.push("NO_RELATIONS");
  return f;
}

/** Dataset-level checks that need to see all records. */
export function datasetFlags(records: VocabRecord[]): Map<number, string[]> {
  const out = new Map<number, string[]>();
  const add = (i: number, flag: string) => out.set(i, [...(out.get(i) ?? []), flag]);

  // Templated examples: same sentence once the headword is masked, shared by 3+ records.
  const templ = new Map<string, number[]>();
  records.forEach((r, i) => {
    if (!r.example_sentence) return;
    const esc = r.english_word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const t = r.example_sentence.replace(new RegExp(`\\b${esc}\\w*`, "ig"), "{w}");
    templ.set(t, [...(templ.get(t) ?? []), i]);
  });
  for (const idxs of templ.values()) if (idxs.length >= 3) idxs.forEach((i) => add(i, "TEMPLATED_EXAMPLE"));

  // Shared Bengali meaning: Bengali->English quiz questions would be ambiguous.
  const bn = new Map<string, number[]>();
  records.forEach((r, i) => bn.set(r.bengali_meaning, [...(bn.get(r.bengali_meaning) ?? []), i]));
  for (const idxs of bn.values()) if (idxs.length > 1) idxs.forEach((i) => add(i, "SHARED_BENGALI_MEANING"));
  return out;
}

/* ---------- row validation ---------- */

export interface ValidatedRow { rowNumber: number; record: VocabRecord | null; issues: Issue[] }
export interface ValidationResult {
  rows: ValidatedRow[];
  issues: Issue[];
  valid: VocabRecord[];
  headerNotes: string[];
}

const isHttp = (u: string) => { try { return ["http:", "https:"].includes(new URL(u).protocol); } catch { return false; } };

export function validateParsed(parsed: ParsedCsv, mapping: Mapping, opts: { cefrIsVerified?: boolean } = {}): ValidationResult {
  const issues: Issue[] = [];
  const headerNotes: string[] = [];
  const get = (row: Record<string, string>, field: string) => (mapping[field] ? cleanText(row[mapping[field]!]) : "");

  // Redundant duplicate columns (e.g. "category" twice): note whether they agree.
  for (const dup of parsed.duplicateHeaders) {
    const second = `${dup}__2`;
    const same = parsed.rows.every((r) => cleanText(r[dup]) === cleanText(r[second]));
    headerNotes.push(same
      ? `Column "${dup}" appears twice with identical values; the first is used and the duplicate is ignored.`
      : `Column "${dup}" appears twice with DIFFERENT values; only the first is used. Review the file.`);
  }
  parsed.parseErrors.forEach((e) => issues.push({ row: e.row, column: "", severity: "warning", code: "PARSE", message: e.message }));

  const rows: ValidatedRow[] = parsed.rows.map((raw, i) => {
    const rowNumber = parsed.rowNumbers[i];
    const ri: Issue[] = [];
    const push = (column: string, severity: Severity, code: string, message: string) => ri.push({ row: rowNumber, column, severity, code, message });

    const word = get(raw, "english_word");
    const bn = get(raw, "bengali_meaning");
    if (!word) push("english_word", "error", "REQUIRED", "english_word is required.");
    if (!bn) push("bengali_meaning", "error", "REQUIRED", "bengali_meaning is required.");
    if (word.length > LIMITS.maxWordChars) push("english_word", "error", "TOO_LONG", `english_word exceeds ${LIMITS.maxWordChars} characters.`);

    for (const f of FIELDS) {
      if (get(raw, f.name).length > LIMITS.maxFieldChars) push(f.name, "error", "TOO_LONG", `${f.name} exceeds ${LIMITS.maxFieldChars} characters.`);
    }

    const cefrRaw = get(raw, "cefr_level");
    let cefr: CefrLevel = "unknown";
    if (!cefrRaw || cefrRaw.toLowerCase() === "unknown") {
      if (!cefrRaw && mapping.cefr_level) push("cefr_level", "warning", "CEFR_EMPTY", "cefr_level is empty; stored as unknown.");
    } else if ((CEFR_LEVELS as readonly string[]).includes(cefrRaw.toUpperCase())) {
      cefr = cefrRaw.toUpperCase() as CefrLevel;
    } else {
      push("cefr_level", "error", "CEFR_INVALID", `"${cefrRaw}" is not one of A1, A2, B1, B2, C1, C2, unknown.`);
    }

    const pos = get(raw, "part_of_speech") || null;
    if (pos) {
      const parts = pos.toLowerCase().split(/[\/,]/).map((s) => s.trim());
      if (!parts.every((p) => (PARTS_OF_SPEECH as readonly string[]).includes(p))) push("part_of_speech", "warning", "POS_UNKNOWN", `"${pos}" is not in the documented part-of-speech list.`);
    }

    const audio = get(raw, "audio_url");
    if (audio && !isHttp(audio)) push("audio_url", "error", "URL_INVALID", "audio_url must be an http(s) URL.");
    const srcUrl = get(raw, "source_url");
    if (srcUrl && !isHttp(srcUrl)) push("source_url", "error", "URL_INVALID", "source_url must be an http(s) URL.");

    const correct = get(raw, "quiz_correct_answer");
    // The answer itself may contain the list delimiter (e.g. a two-part Bengali meaning "A; B"),
    // so protect it as one unit before splitting.
    const TOKEN = "\u0001ANSWER\u0001";
    const optRaw = get(raw, "quiz_options");
    const protectedAnswer = !!correct && /[;|]/.test(correct) && optRaw.includes(correct);
    const options = splitList(protectedAnswer ? optRaw.replace(correct, TOKEN) : optRaw).map((o) => (o === TOKEN ? correct : o));
    if (protectedAnswer) push("quiz_options", "info", "QUIZ_ANSWER_CONTAINS_DELIMITER", "Correct answer contains the list delimiter; treated as a single option.");
    if (correct && options.length && !options.includes(correct)) push("quiz_correct_answer", "error", "QUIZ_ANSWER_NOT_IN_OPTIONS", "quiz_correct_answer is not among quiz_options.");
    if (options.length && options.length < 2) push("quiz_options", "warning", "QUIZ_FEW_OPTIONS", "Fewer than two quiz options.");
    if (options.length && new Set(options.map((o) => o.toLowerCase())).size !== options.length) push("quiz_options", "warning", "QUIZ_DUP_OPTIONS", "Duplicate quiz options.");

    if (ri.some((x) => x.severity === "error")) { issues.push(...ri); return { rowNumber, record: null, issues: ri }; }

    const opt = (f: string) => get(raw, f) || null;
    const record: VocabRecord = {
      external_id: opt("external_id"),
      english_word: word,
      normalized_word: normalizeWord(word),
      bengali_meaning: bn,
      part_of_speech: pos,
      pos_key: posKey(pos),
      cefr_level: cefr,
      cefr_status: opts.cefrIsVerified && cefr !== "unknown" ? "verified" : "provisional",
      category: opt("category"),
      pronunciation: opt("pronunciation"),
      audio_url: audio || null,
      collocations: splitList(get(raw, "collocations")),
      example_sentence: opt("example_sentence"),
      example_translation_bn: opt("example_translation_bn"),
      synonyms: splitList(get(raw, "synonyms")),
      antonyms: splitList(get(raw, "antonyms")),
      word_forms: splitList(get(raw, "word_forms")),
      practice_sentence: opt("practice_sentence"),
      flashcard_front: opt("flashcard_front"),
      flashcard_back: opt("flashcard_back"),
      quiz_question: opt("quiz_question"),
      quiz_correct_answer: correct || null,
      quiz_options: options,
      source_name: opt("source_name"),
      source_url: srcUrl || null,
      license_name: opt("license_name"),
      attribution_text: opt("attribution_text"),
      source_note: opt("source_note"),
      review_flags: [],
    };
    record.review_flags = recordFlags(record);
    issues.push(...ri);
    return { rowNumber, record, issues: ri };
  });

  // dataset-level flags, then surface every flag as a warning with row + column
  const valid = rows.filter((r) => r.record).map((r) => r.record!);
  const ds = datasetFlags(valid);
  const flagCol: Record<string, string> = {
    QUIZ_PLACEHOLDER_OPTIONS: "quiz_options", QUIZ_MIXED_LANGUAGE_OPTIONS: "quiz_options", ARTICLE_AGREEMENT: "example_sentence",
    AWKWARD_BENGALI_TRANSLATION: "example_translation_bn", NO_RELATIONS: "synonyms", TEMPLATED_EXAMPLE: "example_sentence", SHARED_BENGALI_MEANING: "bengali_meaning",
  };
  const flagMsg: Record<string, string> = {
    QUIZ_PLACEHOLDER_OPTIONS: "Quiz options contain generic placeholder distractors; regenerate before use in scored quizzes.",
    QUIZ_MIXED_LANGUAGE_OPTIONS: "Bengali answer is offered alongside non-Bengali options.",
    ARTICLE_AGREEMENT: "Example sentence has an a/an mismatch.",
    AWKWARD_BENGALI_TRANSLATION: "Bengali translation contains a doubled verb pattern; likely machine-templated. Needs editorial review.",
    NO_RELATIONS: "No collocations, synonyms or antonyms supplied.",
    TEMPLATED_EXAMPLE: "Example sentence is a shared template with only the headword swapped; may be unnatural for this word.",
    SHARED_BENGALI_MEANING: "Same Bengali meaning as another word; Bengali-to-English questions would be ambiguous.",
  };
  let k = 0;
  rows.forEach((r) => {
    if (!r.record) return;
    const extra = ds.get(k++) ?? [];
    r.record.review_flags = [...new Set([...r.record.review_flags, ...extra])];
    for (const flag of r.record.review_flags) {
      const iss: Issue = { row: r.rowNumber, column: flagCol[flag] ?? "", severity: flag === "SHARED_BENGALI_MEANING" || flag === "NO_RELATIONS" ? "info" : "warning", code: flag, message: flagMsg[flag] ?? flag };
      r.issues.push(iss); issues.push(iss);
    }
  });

  return { rows, issues, valid, headerNotes };
}

/* ---------- duplicate planning ---------- */

export type DuplicateMode = "skip" | "update" | "new_only";
export interface ExistingIndex { keys: Set<string>; words: Set<string> } // matchKeys and normalized_words already in the database

export interface ImportPlan {
  insert: VocabRecord[];
  update: VocabRecord[];
  skipped: { row: number; record: VocabRecord; reason: string }[];
  rejected: { row: number; issues: Issue[] }[];
  conflicts: { row: number; record: VocabRecord; reason: string }[]; // same word, different POS, already stored
}

/**
 * skip     : same word+POS already stored (or earlier in file) -> skipped; same word with another POS is imported as a separate entry.
 * update   : same word+POS stored -> updated in place; in-file repeats keep the first occurrence.
 * new_only : stricter than skip; anything whose normalized word already exists (any POS) is skipped.
 * Within a single file, the first occurrence wins; later repeats are always skipped and reported.
 */
export function planImport(result: ValidationResult, existing: ExistingIndex, mode: DuplicateMode): ImportPlan {
  const plan: ImportPlan = { insert: [], update: [], skipped: [], rejected: [], conflicts: [] };
  const seenKeys = new Set<string>();
  const seenWords = new Set<string>();
  for (const r of result.rows) {
    if (!r.record) { plan.rejected.push({ row: r.rowNumber, issues: r.issues.filter((i) => i.severity === "error") }); continue; }
    const rec = r.record, key = matchKey(rec);
    if (seenKeys.has(key)) { plan.skipped.push({ row: r.rowNumber, record: rec, reason: "Duplicate of an earlier row in this file." }); continue; }
    seenKeys.add(key);
    const exactExists = existing.keys.has(key);
    const wordExists = existing.words.has(rec.normalized_word);
    if (!exactExists && wordExists) plan.conflicts.push({ row: r.rowNumber, record: rec, reason: "Same word already stored with a different part of speech." });
    if (exactExists) {
      if (mode === "update") plan.update.push(rec);
      else plan.skipped.push({ row: r.rowNumber, record: rec, reason: "Already in the database (same word and part of speech)." });
      continue;
    }
    if (mode === "new_only" && (wordExists || seenWords.has(rec.normalized_word))) {
      plan.skipped.push({ row: r.rowNumber, record: rec, reason: "Word already exists (new_only skips any existing spelling)." });
      continue;
    }
    seenWords.add(rec.normalized_word);
    plan.insert.push(rec);
  }
  return plan;
}
