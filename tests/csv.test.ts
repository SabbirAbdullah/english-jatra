import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseCsvBytes, parseCsvText, CsvError } from "../src/lib/csv/parse";
import { autoMapHeaders, validateParsed, planImport, missingRequiredMappings, matchKey, type ExistingIndex } from "../src/lib/csv/validate";
import { toCsv, safeCell, errorReportToCsv, importTemplateCsv } from "../src/lib/csv/export";
import { commitPlan, type VocabStore } from "../src/lib/import/commit";
import { FIELD_NAMES } from "../src/lib/csv/schema";

const enc = (s: string) => new TextEncoder().encode(s);
const run = (csv: string) => { const p = parseCsvText(csv); const m = autoMapHeaders(p.headers).mapping; return { p, m, v: validateParsed(p, m) }; };
const empty: ExistingIndex = { keys: new Set(), words: new Set() };

describe("encoding", () => {
  it("handles UTF-8 with and without BOM identically and preserves Bengali", () => {
    const body = "english_word,bengali_meaning\nachieve,অর্জন করা\n";
    const a = parseCsvBytes(enc(body)), b = parseCsvBytes(enc("\uFEFF" + body));
    expect(a.headers).toEqual(["english_word", "bengali_meaning"]);
    expect(b.headers).toEqual(a.headers);
    expect(b.rows[0].bengali_meaning).toBe("অর্জন করা");
  });
  it("rejects invalid UTF-8 rather than corrupting text", () => {
    expect(() => parseCsvBytes(new Uint8Array([0x61, 0xff, 0xfe, 0x0a]))).toThrow(CsvError);
  });
  it("rejects empty and oversize input", () => {
    expect(() => parseCsvText("  \n")).toThrow(/empty/i);
    expect(() => parseCsvBytes(new Uint8Array(6 * 1024 * 1024))).toThrow(/limit/i);
  });
});

describe("csv syntax", () => {
  it("handles quoted commas, escaped quotes and multiline fields", () => {
    const { v } = run('english_word,bengali_meaning,example_sentence\nrun,দৌড়ানো,"He said ""go"", then ran,\nfast."\n');
    expect(v.valid).toHaveLength(1);
    expect(v.valid[0].example_sentence).toBe('He said "go", then ran,\nfast.');
  });
  it("keeps both columns when a header repeats and notes it", () => {
    const { p, v } = run("english_word,bengali_meaning,category,category\nrun,দৌড়ানো,Daily,Daily\n");
    expect(p.headers).toEqual(["english_word", "bengali_meaning", "category", "category__2"]);
    expect(v.valid[0].category).toBe("Daily");
    expect(v.headerNotes[0]).toMatch(/identical/);
  });
});

describe("header mapping", () => {
  it("maps legacy headers to canonical fields", () => {
    const { mapping } = autoMapHeaders(["id", "english_example", "example_bengali_translation", "Bengali Meaning", "English Word"]);
    expect(mapping.external_id).toBe("id");
    expect(mapping.example_sentence).toBe("english_example");
    expect(mapping.example_translation_bn).toBe("example_bengali_translation");
    expect(mapping.bengali_meaning).toBe("Bengali Meaning");
    expect(mapping.english_word).toBe("English Word");
  });
  it("reports missing required mappings", () => {
    expect(missingRequiredMappings(autoMapHeaders(["foo", "bar"]).mapping)).toEqual(["english_word", "bengali_meaning"]);
  });
});

describe("validation", () => {
  it("rejects missing required fields with row and column", () => {
    const { v } = run("english_word,bengali_meaning\n,অর্থ\nword,\nok,ঠিক\n");
    const errs = v.issues.filter((i) => i.severity === "error");
    expect(errs.map((e) => [e.row, e.column])).toEqual([[1, "english_word"], [2, "bengali_meaning"]]);
    expect(v.valid).toHaveLength(1);
  });
  it("rejects invalid CEFR, accepts lowercase and unknown, warns on empty", () => {
    const { v } = run("english_word,bengali_meaning,cefr_level\na,১,Z9\nb,২,b2\nc,৩,unknown\nd,৪,\n");
    expect(v.issues.find((i) => i.code === "CEFR_INVALID")?.row).toBe(1);
    expect(v.valid.map((r) => r.cefr_level)).toEqual(["B2", "unknown", "unknown"]);
    expect(v.issues.some((i) => i.code === "CEFR_EMPTY" && i.row === 4)).toBe(true);
  });
  it("marks CEFR provisional unless the caller vouches for it", () => {
    expect(run("english_word,bengali_meaning,cefr_level\na,১,B1\n").v.valid[0].cefr_status).toBe("provisional");
  });
  it("rejects a correct answer that is not among the options", () => {
    const { v } = run("english_word,bengali_meaning,quiz_correct_answer,quiz_options\na,১,x,y; z\n");
    expect(v.issues[0].code).toBe("QUIZ_ANSWER_NOT_IN_OPTIONS");
  });
  it("treats dash placeholders as empty lists", () => {
    expect(run("english_word,bengali_meaning,antonyms\na,১,—\n").v.valid[0].antonyms).toEqual([]);
  });
});

describe("duplicate handling", () => {
  const csv = "english_word,bengali_meaning,part_of_speech\nrun,দৌড়ানো,verb\nRun ,দৌড়,verb\nrun,দৌড়,noun\nwalk,হাঁটা,verb\n";
  it("matches on normalized word + part of speech, not spelling alone", () => {
    const { v } = run(csv);
    const plan = planImport(v, empty, "skip");
    expect(plan.insert.map((r) => matchKey(r))).toEqual(["run|verb", "run|noun", "walk|verb"]);
    expect(plan.skipped).toHaveLength(1);
    expect(plan.skipped[0].row).toBe(2);
  });
  it("skip vs update vs new_only against existing data", () => {
    const { v } = run(csv);
    const existing: ExistingIndex = { keys: new Set(["run|verb"]), words: new Set(["run"]) };
    const skip = planImport(v, existing, "skip");
    expect(skip.insert.map(matchKey)).toEqual(["run|noun", "walk|verb"]);
    expect(skip.conflicts.map((c) => c.row)).toEqual([3]);
    const upd = planImport(v, existing, "update");
    expect(upd.update.map(matchKey)).toEqual(["run|verb"]);
    expect(upd.insert).toHaveLength(2);
    const only = planImport(v, existing, "new_only");
    expect(only.insert.map(matchKey)).toEqual(["walk|verb"]);
  });
  it("treats noun/verb and verb/noun as the same part-of-speech set", () => {
    const { v } = run("english_word,bengali_meaning,part_of_speech\nx,১,noun/verb\nx,২,verb/noun\n");
    expect(planImport(v, empty, "skip").skipped).toHaveLength(1);
  });
});

describe("commit, partial failure and retry", () => {
  const rows = Array.from({ length: 7 }, (_, i) => `w${i},অর্থ${i}`).join("\n");
  const plan = () => planImport(run("english_word,bengali_meaning\n" + rows + "\n").v, empty, "skip");
  it("reports a failed batch honestly and does not count it as imported", async () => {
    let call = 0;
    const store: VocabStore = { insertNew: async () => (++call === 2 ? { error: "boom" } : {}), updateExisting: async () => ({}) };
    const rep = await commitPlan(store, plan(), 7, 3);
    expect(rep.imported).toBe(4);               // batches of 3,3,1 -> batch 2 failed
    expect(rep.failed).toEqual([{ rows: ["w3", "w4", "w5"], error: "boom" }]);
    expect(rep.status).toBe("completed_with_errors");
  });
  it("retry is idempotent: only rows not yet stored are inserted", async () => {
    const db = new Set<string>();
    let failOnce = true;
    const store: VocabStore = {
      insertNew: async (b) => { if (failOnce && b.some((r) => r.english_word === "w3")) { failOnce = false; return { error: "transient" }; } b.forEach((r) => db.add(r.english_word)); return {}; },
      updateExisting: async () => ({}),
    };
    const first = await commitPlan(store, plan(), 7, 3);
    expect(first.status).toBe("completed_with_errors");
    const existing: ExistingIndex = { keys: new Set([...db].map((w) => `${w}|`)), words: db };
    const second = await commitPlan(store, planImport(run("english_word,bengali_meaning\n" + rows + "\n").v, existing, "skip"), 7, 3);
    expect(second.imported).toBe(3);
    expect(second.skipped).toBe(4);
    expect(db.size).toBe(7);
  });
  it("reports total failure as failed", async () => {
    const rep = await commitPlan({ insertNew: async () => ({ error: "down" }), updateExisting: async () => ({}) }, plan(), 7);
    expect(rep.status).toBe("failed");
    expect(rep.imported).toBe(0);
  });
});

describe("export", () => {
  it("neutralizes formula injection and quotes correctly", () => {
    expect(safeCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(safeCell("+1")).toBe("'+1");
    expect(safeCell("অর্জন")).toBe("অর্জন");
    const out = toCsv(["a", "b"], [{ a: 'he said "hi", ok', b: "line1\nline2" }, { a: ["x", "y"], b: "@cmd" }]);
    expect(out.startsWith("\uFEFF")).toBe(true);
    expect(out).toContain('"he said ""hi"", ok","line1\nline2"');
    expect(out).toContain('x; y,\'@cmd');
  });
  it("round-trips Bengali through export and re-parse", () => {
    const out = toCsv(["english_word", "bengali_meaning"], [{ english_word: "achieve", bengali_meaning: "অর্জন করা" }]);
    expect(parseCsvText(out).rows[0].bengali_meaning).toBe("অর্জন করা");
  });
  it("produces an error report and a header-only template matching the schema", () => {
    const { v } = run("english_word,bengali_meaning\n,x\n");
    expect(errorReportToCsv(v.issues)).toContain("REQUIRED");
    expect(parseCsvText(importTemplateCsv()).headers).toEqual(FIELD_NAMES);
  });
});

describe("supplied batch 001 (real file)", () => {
  const bytes = new Uint8Array(readFileSync("data/english_vocabulary_batch_001_enhanced.csv"));
  const p = parseCsvBytes(bytes);
  const { mapping, unmapped } = autoMapHeaders(p.headers);
  const v = validateParsed(p, mapping);
  it("detects 170 records and maps every column", () => {
    expect(p.rows).toHaveLength(170);
    expect(missingRequiredMappings(mapping)).toEqual([]);
    expect(unmapped).toEqual(["category__2"]);
    expect(v.headerNotes[0]).toMatch(/identical/);
  });
  it("imports all 170 with zero errors and Bengali intact", () => {
    expect(v.valid).toHaveLength(170);
    expect(v.issues.filter((i) => i.severity === "error")).toHaveLength(0);
    expect(v.valid[0]).toMatchObject({ english_word: "achieve", bengali_meaning: "অর্জন করা", cefr_level: "B1", category: "Work & Career" });
    expect(v.valid.every((r) => r.cefr_status === "provisional")).toBe(true);
  });
  it("finds no duplicates within the file", () => {
    expect(planImport(v, empty, "skip").insert).toHaveLength(170);
  });
  it("flags every record's placeholder quiz options for editorial review", () => {
    expect(v.valid.filter((r) => r.review_flags.includes("QUIZ_PLACEHOLDER_OPTIONS"))).toHaveLength(170);
  });
});

describe("quiz options whose answer contains the delimiter (found in batch 001 rows 136, 154, 167)", () => {
  it("keeps a multi-part answer as one option", () => {
    const { v } = run('english_word,bengali_meaning,quiz_correct_answer,quiz_options\nbrilliant,মেধাবী; চমৎকার,মেধাবী; চমৎকার,"মেধাবী; চমৎকার; clever; —; বিপরীত অর্থ"\n');
    expect(v.issues.filter((i) => i.severity === "error")).toHaveLength(0);
    expect(v.valid[0].quiz_options).toEqual(["মেধাবী; চমৎকার", "clever", "বিপরীত অর্থ"]);
  });
});
