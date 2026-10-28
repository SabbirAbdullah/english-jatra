import { FIELD_NAMES, type VocabRecord } from "./schema";
import type { Issue } from "./validate";

const BOM = "\uFEFF";

/** Neutralize spreadsheet formula injection (OWASP): prefix risky leading characters with an apostrophe. */
export function safeCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}

const quote = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export function toCsv(columns: string[], rows: Record<string, unknown>[], opts: { bom?: boolean } = { bom: true }): string {
  const lines = [columns.map((c) => quote(safeCell(c))).join(",")];
  for (const r of rows) lines.push(columns.map((c) => quote(safeCell(Array.isArray(r[c]) ? (r[c] as unknown[]).join("; ") : r[c]))).join(","));
  return (opts.bom === false ? "" : BOM) + lines.join("\r\n") + "\r\n";
}

export const vocabularyToCsv = (records: Partial<VocabRecord>[]) => toCsv(FIELD_NAMES, records as Record<string, unknown>[]);

export const errorReportToCsv = (issues: Issue[]) =>
  toCsv(["row", "column", "severity", "code", "message"], issues as unknown as Record<string, unknown>[]);

/** Header-only template matching the canonical schema. */
export const importTemplateCsv = () => toCsv(FIELD_NAMES, []);
