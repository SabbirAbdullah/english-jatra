/** Rule-based practice checks. These are NOT an IELTS band score and are not AI feedback. */
export const wordCount = (t: string) => (t.trim().match(/[\p{L}\p{N}'’-]+/gu) ?? []).length;

const STOP = new Set("the a an and or but of to in on at for with is are was were be been it this that i you he she we they my your his her our their as by from".split(" "));

export function writingChecks(text: string, minWords: number) {
  const notes: string[] = [];
  const words = wordCount(text);
  if (words < minWords) notes.push(`Length: ${words} words; this task asks for at least ${minWords}.`);
  else notes.push(`Length: ${words} words (target ${minWords}+). Good.`);
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
  if (sentences.length) {
    const avg = Math.round(words / sentences.length);
    notes.push(`Average sentence length: ${avg} words.` + (avg < 8 ? " Try combining some short sentences." : avg > 30 ? " Some sentences may be too long to follow." : ""));
  }
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
  if (paragraphs < 3 && words >= minWords) notes.push("Structure: use clear paragraphs (introduction, body, conclusion).");
  const freq = new Map<string, number>();
  (text.toLowerCase().match(/[a-z']+/g) ?? []).filter((w) => w.length > 3 && !STOP.has(w)).forEach((w) => freq.set(w, (freq.get(w) ?? 0) + 1));
  const rep = [...freq].filter(([, n]) => n >= 4).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (rep.length) notes.push(`Repetition: you used ${rep.map(([w, n]) => `“${w}” ${n}×`).join(", ")}. Try synonyms.`);
  if (/\bi think\b/i.test(text) && words > 0) notes.push("Tip: vary opinion phrases (e.g. “In my view”, “It seems to me that”).");
  return notes;
}

const PATTERNS: [RegExp, string][] = [
  [/\bam agree\b/i, "“I am agree” → “I agree” (agree is already a verb)."],
  [/\b(he|she|it) don'?t\b/i, "“he/she/it don't” → “doesn't”."],
  [/\bI have \d+ years? old\b/i, "Say “I am 25 years old”, not “I have 25 years old”."],
  [/\bmore (taller|bigger|better|faster|smaller|easier)\b/i, "Don't use “more” with -er comparatives."],
  [/\bdiscuss about\b/i, "“discuss about” → “discuss” (no preposition)."],
  [/\bdid not (saw|went|ate|came|took|gave)\b/i, "After “did not”, use the base verb (see, go, eat…)."],
  [/\bI am (boring|interesting|exciting)\b/i, "For feelings use -ed: “I am bored/interested/excited”."],
  [/\b(a) ([aeiou]\w+)/i, "Use “an” before vowel sounds (an apple). Check your a/an."],
];

export function sentenceChecks(s: string, targetWord?: string) {
  const notes: string[] = [];
  const t = s.trim();
  if (!t) return ["Write a sentence first."];
  if (!/^[A-Z]/.test(t)) notes.push("Start the sentence with a capital letter.");
  if (!/[.!?]$/.test(t)) notes.push("End the sentence with . ! or ?");
  if (targetWord && !new RegExp(`\\b${targetWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(t)) notes.push(`Your sentence does not contain “${targetWord}”.`);
  for (const [re, msg] of PATTERNS) {
    const m = t.match(re);
    if (m && !(re.source.startsWith("\\b(a)") && /^(uni|use|eu|one)/i.test(m[2]))) notes.push(msg);
  }
  if (wordCount(t) < 4) notes.push("Try a longer sentence (at least 4 words).");
  return notes.length ? notes : ["No basic issues found. (This is a simple automatic check, not a full grammar review.)"];
}
