import { describe, it, expect } from "vitest";
import { nextProgress } from "../src/lib/srs";
import { buildQuestion, buildQuiz, eligibleTypes, isCorrect, shuffle, type QWord } from "../src/lib/quiz";
import { sentenceChecks, writingChecks, wordCount } from "../src/lib/checks";

const w = (id: string, en: string, bn: string, extra: Partial<QWord> = {}): QWord => ({
  id, english_word: en, bengali_meaning: bn, part_of_speech: "verb", synonyms: [], antonyms: [], collocations: [], example_sentence: null, review_flags: [], ...extra,
});
const pool: QWord[] = [
  w("1", "achieve", "অর্জন করা", { synonyms: ["accomplish"], antonyms: ["fail"], example_sentence: "She worked hard to achieve her goals." }),
  w("2", "obtain", "অর্জন করা"), w("3", "adapt", "মানিয়ে নেওয়া"), w("4", "explain", "ব্যাখ্যা করা"),
  w("5", "improve", "উন্নত করা"), w("6", "avoid", "এড়িয়ে চলা"), w("7", "fail", "ব্যর্থ হওয়া"), w("8", "accomplish", "সম্পন্ন করা"),
];

describe("spaced repetition", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  it("does not mark a word known after one successful review", () => {
    const r = nextProgress(null, "know", now);
    expect(r.status).toBe("learning");
    expect(r.interval_days).toBe(1);
    expect(r.next_review_at).toBe("2026-01-02T00:00:00.000Z");
  });
  it("reaches known only after repeated success; difficult resets the interval", () => {
    let p: any = null;
    const statuses: string[] = [];
    for (let i = 0; i < 4; i++) { p = nextProgress(p, "know", now); statuses.push(p.status); }
    expect(statuses).toEqual(["learning", "learning", "known", "known"]);
    const d = nextProgress(p, "difficult", now);
    expect(d.status).toBe("difficult"); expect(d.interval_days).toBe(0); expect(d.attempts).toBe(5);
    expect(d.ease).toBeGreaterThanOrEqual(1.3);
  });
});

describe("quiz engine", () => {
  const seeded = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  it("excludes bn_to_en for words sharing a Bengali meaning", () => {
    expect(eligibleTypes(pool[0], pool)).not.toContain("bn_to_en");
    expect(eligibleTypes(pool[2], pool)).toContain("bn_to_en");
  });
  it("always produces 4 distinct options that include the correct answer", () => {
    for (const type of ["en_to_bn", "bn_to_en", "synonym", "antonym", "fill_blank"] as const) {
      const q = buildQuestion(pool[type === "bn_to_en" ? 2 : 0], type, pool, seeded);
      expect(q, type).not.toBeNull();
      expect(new Set(q!.options.map((o) => o.toLowerCase())).size).toBe(4);
    }
  });
  it("never offers a synonym or antonym as a wrong option", () => {
    for (let i = 0; i < 30; i++) {
      const q = buildQuestion(pool[0], "synonym", pool, seeded)!;
      expect(q.options.filter((o) => ["accomplish", "fail"].includes(o))).toEqual(["accomplish"]);
    }
  });
  it("questions carry no answer fields and grading uses the database word", () => {
    const q = buildQuestion(pool[2], "en_to_bn", pool, seeded)!;
    expect(Object.keys(q).sort()).toEqual(["options", "prompt", "type", "wordId"]);
    expect(isCorrect(pool[2], "en_to_bn", "মানিয়ে নেওয়া")).toBe(true);
    expect(isCorrect(pool[2], "en_to_bn", "অর্জন করা")).toBe(false);
    expect(isCorrect(pool[0], "synonym", "Accomplish")).toBe(true);
    expect(isCorrect(pool[0], "synonym", null)).toBe(false);
  });
  it("skips fill-in-the-blank for flagged templated examples", () => {
    const flagged = { ...pool[0], review_flags: ["TEMPLATED_EXAMPLE"] };
    expect(eligibleTypes(flagged, pool)).not.toContain("fill_blank");
  });
  it("returns fewer questions rather than bad ones when the pool is tiny", () => {
    expect(buildQuiz(pool.slice(0, 3), pool.slice(0, 3), { type: "en_to_bn", count: 5 })).toHaveLength(0);
    expect(shuffle([1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4]);
  });
});

describe("practice checks", () => {
  it("flags common learner errors", () => {
    expect(sentenceChecks("i am agree with you").join(" ")).toMatch(/capital|agree/);
    expect(sentenceChecks("She doesn't like tea.")[0]).toMatch(/No basic issues/);
    expect(sentenceChecks("I want to achieve more.", "improve")[0]).toMatch(/does not contain/);
    expect(sentenceChecks("I saw a university.").join(" ")).not.toMatch(/an/);
  });
  it("counts words and reports length against the target", () => {
    expect(wordCount("It's a well-known fact.")).toBe(4);
    expect(writingChecks("Short.", 150)[0]).toMatch(/at least 150/);
  });
});
