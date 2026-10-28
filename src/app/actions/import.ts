"use server";
import { requireAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { CsvError, parseCsvBytes, type ParsedCsv } from "@/lib/csv/parse";
import { FIELDS, LIMITS } from "@/lib/csv/schema";
import { autoMapHeaders, missingRequiredMappings, planImport, validateParsed, matchKey, type DuplicateMode, type Issue, type Mapping } from "@/lib/csv/validate";
import { commitPlan, type CommitReport } from "@/lib/import/commit";
import { loadExistingIndex, makeSupabaseStore } from "@/lib/import/supabase-store";

type Fail = { ok: false; error: string };
const MODES: DuplicateMode[] = ["skip", "update", "new_only"];

/** Everything is re-derived on the server from the uploaded bytes; nothing the browser computed is trusted. */
async function load(fd: FormData) {
  const ctx = await requireAdmin();
  const f = fd.get("file");
  if (!(f instanceof File)) throw new Error("No file received.");
  if (!/\.csv$/i.test(f.name)) throw new Error("Only .csv files are supported.");
  if (f.size === 0) throw new Error("The file is empty.");
  if (f.size > LIMITS.maxFileBytes) throw new Error(`File is larger than ${LIMITS.maxFileBytes / 1024 / 1024} MB.`);
  let parsed: ParsedCsv;
  try { parsed = parseCsvBytes(new Uint8Array(await f.arrayBuffer())); } catch (e) { throw new Error(e instanceof CsvError ? e.message : "The file could not be parsed as CSV."); }
  return { ...ctx, file: f, parsed };
}
function readMapping(fd: FormData, parsed: ParsedCsv): Mapping {
  const auto = autoMapHeaders(parsed.headers).mapping;
  const raw = fd.get("mapping");
  if (typeof raw !== "string" || !raw) return auto;
  const given = JSON.parse(raw) as Record<string, string | null>;
  const m: Mapping = {};
  for (const f of FIELDS) { const v = given[f.name]; m[f.name] = typeof v === "string" && parsed.headers.includes(v) ? v : null; }
  return m;
}
const readMode = (fd: FormData): DuplicateMode => (MODES.includes(fd.get("mode") as DuplicateMode) ? (fd.get("mode") as DuplicateMode) : "skip");
const errMsg = (e: unknown): Fail => ({ ok: false, error: e instanceof Error ? e.message : "Unexpected error." });

export async function previewImportAction(fd: FormData) {
  try {
    const { parsed, file } = await load(fd);
    const { mapping, unmapped } = autoMapHeaders(parsed.headers);
    return {
      ok: true as const, fileName: file.name, fileBytes: file.size, total: parsed.rows.length, headers: parsed.headers, mapping, unmapped,
      missing: missingRequiredMappings(mapping), duplicateHeaders: parsed.duplicateHeaders, preview: parsed.rows.slice(0, 5), parseErrors: parsed.parseErrors.slice(0, 20),
    };
  } catch (e) { return errMsg(e); }
}

export async function analyzeImportAction(fd: FormData) {
  try {
    const { sb, user, parsed } = await load(fd);
    if (!rateLimit(`analyze:${user.id}`, 20, 60_000)) throw new Error("Too many requests. Wait a minute and try again.");
    const mapping = readMapping(fd, parsed), mode = readMode(fd);
    const missing = missingRequiredMappings(mapping);
    if (missing.length) throw new Error(`Map the required column(s): ${missing.join(", ")}.`);
    const validation = validateParsed(parsed, mapping);
    const existing = await loadExistingIndex(sb);
    const plan = planImport(validation, existing, mode);

    const groups = new Map<string, { code: string; severity: string; count: number; message: string }>();
    for (const i of validation.issues) { const g = groups.get(i.code); if (g) g.count++; else groups.set(i.code, { code: i.code, severity: i.severity, count: 1, message: i.message }); }
    const order = { error: 0, warning: 1, info: 2 } as Record<string, number>;

    // Conflict review for "update": which stored fields would change?
    const changes: { row: number; word: string; pos: string | null; fields: string[] }[] = [];
    if (plan.update.length) {
      const words = [...new Set(plan.update.map((r) => r.normalized_word))];
      const stored = new Map<string, any>();
      for (let i = 0; i < words.length; i += 100) {
        const { data } = await sb.from("vocabulary_words").select("normalized_word,pos_key,bengali_meaning,cefr_level,example_sentence,example_translation_bn").in("normalized_word", words.slice(i, i + 100));
        (data ?? []).forEach((r: any) => stored.set(matchKey(r), r));
      }
      for (const r of plan.update) {
        const old = stored.get(matchKey(r)); if (!old) continue;
        const fields = (["bengali_meaning", "cefr_level", "example_sentence", "example_translation_bn"] as const).filter((k) => (old[k] ?? null) !== (r[k] ?? null));
        changes.push({ row: 0, word: r.english_word, pos: r.part_of_speech, fields });
      }
    }
    return {
      ok: true as const, mode,
      counts: { detected: parsed.rows.length, insert: plan.insert.length, update: plan.update.length, skipped: plan.skipped.length, rejected: plan.rejected.length, conflicts: plan.conflicts.length,
        errors: validation.issues.filter((i) => i.severity === "error").length, warnings: validation.issues.filter((i) => i.severity === "warning").length },
      groups: [...groups.values()].sort((a, b) => order[a.severity] - order[b.severity] || b.count - a.count),
      rejected: plan.rejected.slice(0, 100).map((r) => ({ row: r.row, messages: r.issues.map((i) => `${i.column}: ${i.message}`) })),
      skipped: plan.skipped.slice(0, 50).map((s) => ({ row: s.row, word: s.record.english_word, reason: s.reason })),
      conflicts: plan.conflicts.slice(0, 50).map((s) => ({ row: s.row, word: s.record.english_word, reason: s.reason })),
      changes: changes.filter((c) => c.fields.length).slice(0, 100),
      headerNotes: validation.headerNotes,
      issues: validation.issues.slice(0, 5000) as Issue[],
    };
  } catch (e) { return errMsg(e); }
}

export async function commitImportAction(fd: FormData) {
  try {
    const { sb, user, parsed, file } = await load(fd);
    if (!rateLimit(`commit:${user.id}`, 5, 60_000)) throw new Error("Too many imports. Wait a minute and try again.");
    if (fd.get("confirm") !== "yes") throw new Error("Confirmation is required before writing to the database.");
    const batch = String(fd.get("batch") ?? "").trim();
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(batch)) throw new Error("Batch name: 1–40 letters, digits, - or _.");
    const mapping = readMapping(fd, parsed), mode = readMode(fd);
    const missing = missingRequiredMappings(mapping);
    if (missing.length) throw new Error(`Map the required column(s): ${missing.join(", ")}.`);

    const validation = validateParsed(parsed, mapping);
    const plan = planImport(validation, await loadExistingIndex(sb), mode);
    const report: CommitReport = await commitPlan(makeSupabaseStore(sb, batch), plan, parsed.rows.length);

    const warnings = validation.issues.filter((i) => i.severity === "warning").length;
    const { data: job, error: jobErr } = await sb.from("import_jobs").insert({
      batch_name: batch, file_name: file.name.slice(0, 200), file_bytes: file.size, duplicate_mode: mode, status: report.status, created_by: user.id,
      rows_detected: report.detected, rows_imported: report.imported, rows_updated: report.updated, rows_skipped: report.skipped, rows_rejected: report.rejected, warnings,
    }).select("id").single();
    if (job) {
      const rows = [
        ...validation.issues.filter((i) => i.severity !== "info").slice(0, 1000).map((i) => ({ job_id: job.id, row_number: i.row, column_name: i.column || null, severity: i.severity, code: i.code, message: i.message })),
        ...report.failed.map((f) => ({ job_id: job.id, row_number: 0, column_name: null, severity: "error", code: "WRITE_FAILED", message: `${f.error} (words: ${f.rows.slice(0, 8).join(", ")}${f.rows.length > 8 ? "…" : ""})` })),
      ];
      if (rows.length) await sb.from("import_errors").insert(rows);
    }
    return { ok: true as const, report, jobId: job?.id ?? null, auditSaved: !jobErr, batch, retryHint: report.failed.length ? "Some batches failed. Fix the cause and upload the same file again: rows already imported are skipped, so only the missing rows are written." : null };
  } catch (e) { return errMsg(e); }
}
