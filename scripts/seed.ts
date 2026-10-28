/**
 * Import a vocabulary CSV.
 *   npm run seed:dry                       -> validate only, write reports to docs/, touch nothing
 *   npm run seed                           -> write to Supabase (needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
 * Options: --file <path> --batch <name> --mode skip|update|new_only
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseCsvBytes } from "../src/lib/csv/parse";
import { autoMapHeaders, missingRequiredMappings, validateParsed, planImport, matchKey, type DuplicateMode, type ExistingIndex } from "../src/lib/csv/validate";
import { errorReportToCsv } from "../src/lib/csv/export";
import { commitPlan, type VocabStore } from "../src/lib/import/commit";
import { makeSupabaseStore, loadExistingIndex } from "../src/lib/import/supabase-store";

const arg = (n: string, d?: string) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const dry = process.argv.includes("--dry-run");
const file = arg("file", "data/english_vocabulary_batch_001_enhanced.csv")!;
const batch = arg("batch", "batch_001")!;
const mode = arg("mode", "skip") as DuplicateMode;

const bytes = new Uint8Array(readFileSync(file));
const parsed = parseCsvBytes(bytes);
const { mapping } = autoMapHeaders(parsed.headers);
const missing = missingRequiredMappings(mapping);
if (missing.length) { console.error("Cannot import: required columns not found:", missing.join(", ")); process.exit(1); }
const validation = validateParsed(parsed, mapping);

mkdirSync("docs", { recursive: true });
const errorsOnly = validation.issues.filter((i) => i.severity === "error");
writeFileSync(`docs/${batch}-issues.csv`, errorReportToCsv(validation.issues));

const byCode: Record<string, number> = {};
validation.issues.forEach((i) => (byCode[i.code] = (byCode[i.code] ?? 0) + 1));

async function main() {
  let existing: ExistingIndex = { keys: new Set(), words: new Set() };
  let sb: SupabaseClient<any> | null = null;
  if (!dry) {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) { console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server-side only), or use --dry-run."); process.exit(1); }
    sb = createClient<any>(url, key, { auth: { persistSession: false } });
    existing = await loadExistingIndex(sb);   // duplicate detection spans ALL previous batches
  }
  const plan = planImport(validation, existing, mode);
  let report: any = { detected: parsed.rows.length, wouldImport: plan.insert.length, wouldUpdate: plan.update.length, skipped: plan.skipped.length, rejected: plan.rejected.length, conflicts: plan.conflicts.length };

  if (!dry && sb) {
    const client = sb;
    const store = makeSupabaseStore(client, batch);
    report = await commitPlan(store, plan, parsed.rows.length);
    await client.from("import_jobs").insert({ batch_name: batch, file_name: basename(file), file_bytes: bytes.byteLength, duplicate_mode: mode, status: report.status,
      rows_detected: report.detected, rows_imported: report.imported, rows_updated: report.updated, rows_skipped: report.skipped, rows_rejected: report.rejected, warnings: validation.issues.filter((i) => i.severity === "warning").length });
  }
  const summary = { file: basename(file), batch, mode, dryRun: dry, ...report, errors: errorsOnly.length, issuesByCode: byCode, headerNotes: validation.headerNotes };
  writeFileSync(`docs/${batch}-report.json`, JSON.stringify(summary, null, 2) + "\n");
  console.log(JSON.stringify(summary, null, 2));
  if (report.failed?.length) process.exit(2);
}
main();
