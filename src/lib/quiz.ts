/** Quiz generation and grading from verified vocabulary fields. Never uses the CSV's stored placeholder options. */
export type QuizType = "en_to_bn" | "bn_to_en" | "synonym" | "antonym" | "fill_blank";
export const QUIZ_TYPES: { value: QuizType | "mixed"; label: string }[] = [
  { value: "mixed", label: "Mixed" }, { value: "en_to_bn", label: "English → Bengali" }, { value: "bn_to_en", label: "Bengali → English" },
  { value: "synonym", label: "Synonyms" }, { value: "antonym", label: "Antonyms" }, { value: "fill_blank", label: "Fill in the blank" },
];

export interface QWord {
  id: string; english_word: string; bengali_meaning: string; part_of_speech: string | null;
  synonyms: string[]; antonyms: string[]; collocations: string[]; example_sentence: string | null; review_flags: string[];
}
/** Sent to the browser. Contains no answers. */
export interface Question { wordId: string; type: QuizType; prompt: string; options: string[] }

const BAD_EXAMPLE_FLAGS = ["TEMPLATED_EXAMPLE", "ARTICLE_AGREEMENT"];
const lc = (s: string) => s.toLowerCase().trim();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function shuffle<T>(a: T[], rng: () => number = Math.random): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

/** Which question types can be asked about this word without ambiguity. */
export function eligibleTypes(w: QWord, pool: QWord[]): QuizType[] {
  const t: QuizType[] = ["en_to_bn"];
  // Bengali->English is ambiguous when another word shares the meaning.
  if (!pool.some((o) => o.id !== w.id && o.bengali_meaning === w.bengali_meaning)) t.push("bn_to_en");
  if (w.synonyms.length) t.push("synonym");
  if (w.antonyms.length) t.push("antonym");
  if (w.example_sentence && !w.review_flags.some((f) => BAD_EXAMPLE_FLAGS.includes(f)) && new RegExp(`\\b${esc(w.english_word)}\\w*`, "i").test(w.example_sentence)) t.push("fill_blank");
  return t;
}

function pick<T extends QWord>(w: QWord, pool: T[], ok: (o: T) => boolean, n: number, rng: () => number): T[] {
  const cands = pool.filter((o) => o.id !== w.id && ok(o));
  const same = shuffle(cands.filter((o) => o.part_of_speech === w.part_of_speech), rng);
  const rest = shuffle(cands.filter((o) => o.part_of_speech !== w.part_of_speech), rng);
  return [...same, ...rest].slice(0, n);
}

export function buildQuestion(w: QWord, type: QuizType, pool: QWord[], rng: () => number = Math.random): Question | null {
  const nonRelated = (o: QWord) => !w.synonyms.map(lc).includes(lc(o.english_word)) && !w.antonyms.map(lc).includes(lc(o.english_word)) && o.bengali_meaning !== w.bengali_meaning;
  let prompt = "", correct = "", distractors: string[] = [];
  if (type === "en_to_bn") {
    prompt = `What is the Bengali meaning of “${w.english_word}”?`; correct = w.bengali_meaning;
    distractors = pick(w, pool, (o) => o.bengali_meaning !== w.bengali_meaning, 12, rng).map((o) => o.bengali_meaning);
  } else if (type === "bn_to_en") {
    prompt = `Which English word means “${w.bengali_meaning}”?`; correct = w.english_word;
    distractors = pick(w, pool, (o) => o.bengali_meaning !== w.bengali_meaning, 3, rng).map((o) => o.english_word);
  } else if (type === "synonym") {
    if (!w.synonyms.length) return null;
    correct = shuffle(w.synonyms, rng)[0]; prompt = `Which word is closest in meaning to “${w.english_word}”?`;
    distractors = pick(w, pool, nonRelated, 3, rng).map((o) => o.english_word);
  } else if (type === "antonym") {
    if (!w.antonyms.length) return null;
    correct = shuffle(w.antonyms, rng)[0]; prompt = `Which word is opposite in meaning to “${w.english_word}”?`;
    distractors = pick(w, pool, nonRelated, 3, rng).map((o) => o.english_word);
  } else {
    if (!w.example_sentence) return null;
    prompt = `Fill in the blank (base form): ${w.example_sentence.replace(new RegExp(`\\b${esc(w.english_word)}\\w*`, "i"), "_____")}`;
    correct = w.english_word;
    distractors = pick(w, pool, nonRelated, 3, rng).map((o) => o.english_word);
  }
  const uniq: string[] = [];
  for (const d of distractors) if (lc(d) !== lc(correct) && !uniq.some((u) => lc(u) === lc(d))) uniq.push(d);
  if (uniq.length < 3) return null; // never ship a question with fewer than 4 distinct options
  return { wordId: w.id, type, prompt, options: shuffle([correct, ...uniq.slice(0, 3)], rng) };
}

export function buildQuiz(targets: QWord[], pool: QWord[], opts: { type: QuizType | "mixed"; count: number }, rng: () => number = Math.random): Question[] {
  const out: Question[] = [];
  for (const w of shuffle(targets, rng)) {
    if (out.length >= opts.count) break;
    const elig = eligibleTypes(w, pool).filter((t) => opts.type === "mixed" || t === opts.type);
    for (const t of shuffle(elig, rng)) { const q = buildQuestion(w, t, pool, rng); if (q) { out.push(q); break; } }
  }
  return out;
}

/** Grade against the database record, never against anything the browser sent. */
export function isCorrect(w: QWord, type: QuizType, selected: string | null): boolean {
  if (!selected) return false;
  const s = lc(selected);
  switch (type) {
    case "en_to_bn": return selected.trim() === w.bengali_meaning;
    case "bn_to_en": case "fill_blank": return s === lc(w.english_word);
    case "synonym": return w.synonyms.map(lc).includes(s);
    case "antonym": return w.antonyms.map(lc).includes(s);
  }
}
export function correctAnswerText(w: QWord, type: QuizType): string {
  switch (type) {
    case "en_to_bn": return w.bengali_meaning;
    case "bn_to_en": case "fill_blank": return w.english_word;
    case "synonym": return w.synonyms.join(", ");
    case "antonym": return w.antonyms.join(", ");
  }
}
export const explanationFor = (w: QWord) =>
  `${w.english_word}${w.part_of_speech ? ` (${w.part_of_speech})` : ""} = ${w.bengali_meaning}` + (w.collocations.length ? `. Common phrases: ${w.collocations.slice(0, 3).join("; ")}.` : ".");
